#!/usr/bin/env python3
"""移动端复现覆盖率对账（值匹配口径）：strings.xml 的 value 是否已嵌入 src/qoder-mobile.js。

口径（详见 docs/coverage-audit.md 第二章）：
  APK 键的 en（values/）或 zh-rCN（values-zh-rCN/）任一值命中 JS 字面量集合即计为覆盖；
  按 SDK/框架前缀剥离噪音键（abc_/androidx_/m3c_/exo_/hms_/authsdk 等），只对业务键计覆盖率。

用法：
  python3 scripts/coverage_audit.py [--res <apktool 输出的 res 目录>] [--js <qoder-mobile.js>]

默认路径相对仓库根：res = mobile/apktool-out/res（反编译产物不入库，需自行 apktool 反编译官方
APK 获得；开发机上亦可用 --res /home/z/my-project/mobile/apktool-out/res 指定）。
"""
import argparse
import collections
import html as htmllib
import os
import re

SDK_PREFIXES = ('abc_', 'androidx_', 'android.', 'm3c_', 'exo_', 'hms_', 'authsdk',
                'google_', 'call_notification', 'credentials', 'abb_', 'common_sdk')


def repo_root():
    """脚本位于 <repo>/scripts/ 下，返回仓库根。"""
    return os.path.dirname(os.path.dirname(os.path.abspath(__file__)))


def main():
    root = repo_root()
    ap = argparse.ArgumentParser(description='移动端复现覆盖率对账（值匹配口径）')
    ap.add_argument('--res', default=os.path.join('mobile', 'apktool-out', 'res'),
                    help='apktool 反编译输出的 res 目录（含 values/ 与 values-zh-rCN/）')
    ap.add_argument('--js', default=os.path.join('src', 'qoder-mobile.js'),
                    help='复现实现 JS 文件')
    ap.add_argument('--demo', default=os.path.join('examples', 'mobile.html'),
                    help='演示页 HTML（可选，缺省时跳过屏结构统计）')
    a = ap.parse_args()

    res_dir = a.res if os.path.isabs(a.res) else os.path.join(root, a.res)
    js_path = a.js if os.path.isabs(a.js) else os.path.join(root, a.js)
    demo_path = a.demo if os.path.isabs(a.demo) else os.path.join(root, a.demo)

    apk_strings = os.path.join(res_dir, 'values', 'strings.xml')
    zh_strings = os.path.join(res_dir, 'values-zh-rCN', 'strings.xml')

    # 1. APK 侧：键 + 英文值 + 中文值（values/ 英文基准，values-zh-rCN 中文）
    xml = open(apk_strings, encoding='utf-8', errors='replace').read()
    pairs = re.findall(r'<string name="([^"]+)">(.*?)</string>', xml, re.S)
    zh_xml = open(zh_strings, encoding='utf-8', errors='replace').read()
    zh_pairs = dict(re.findall(r'<string name="([^"]+)">(.*?)</string>', zh_xml, re.S))

    def norm(s):
        s = htmllib.unescape(s)
        s = re.sub(r'\s+', ' ', s).strip()
        # 占位符统一，便于匹配 %@ / %1$s 等
        return re.sub(r'%[0-9$]*[sd@]', '%@', s)

    key2val = {k: norm(v) for k, v in pairs}
    key2zh = {k: norm(zh_pairs.get(k, '')) for k in key2val}
    print(f'APK values/strings.xml 键总数: {len(key2val)}（zh-rCN: {len(zh_pairs)}）')

    # 2. JS 侧：全部字符串字面量（单双引号），规范化后入集合
    js = open(js_path, encoding='utf-8', errors='replace').read()
    lits = set()
    for m in re.findall(r"'((?:[^'\\]|\\.)*)'", js) + re.findall(r'"((?:[^"\\]|\\.)*)"', js):
        v = norm(m.replace("\\'", "'").replace('\\"', '"').replace('\\n', ' '))
        if v:
            lits.add(v)
    print(f'JS 字符串字面量（规范化后）: {len(lits)}')

    # 3. 值匹配（en 或 zh 任一命中即覆盖）→ 键覆盖
    covered_keys, uncovered_keys = set(), set()
    for k in key2val:
        if (key2val[k] and key2val[k] in lits) or (key2zh.get(k) and key2zh[k] in lits):
            covered_keys.add(k)
        else:
            uncovered_keys.add(k)
    n = len(key2val)
    print(f'\n双值匹配覆盖键: {len(covered_keys)} ({len(covered_keys) / n * 100:.1f}%)')
    print(f'未覆盖键:      {len(uncovered_keys)} ({len(uncovered_keys) / n * 100:.1f}%)')

    # 3b. 剥离第三方 SDK/框架键后的“Qoder 业务键”覆盖
    def is_sdk(k):
        return k.startswith(SDK_PREFIXES)

    biz = [k for k in key2val if not is_sdk(k)]
    biz_cov = [k for k in biz if k in covered_keys]
    print(f'\nSDK/框架噪音键: {n - len(biz)}（abc/m3c/exo/hms/authsdk 等，非 Qoder UI，不应计入复现面）')
    print(f'Qoder 业务键: {len(biz)}，其中覆盖 {len(biz_cov)} ({len(biz_cov) / len(biz) * 100:.1f}%)，'
          f'未覆盖 {len(biz) - len(biz_cov)}')

    # 4. 前缀分组（仅业务键）
    def prefix(k):
        p = k.split('_')
        if len(p) >= 2 and p[0] in ('composer', 'tasks', 'workspace', 'conversation', 'cd',
                                    'markdown', 'new_task', 'tool_use', 'session', 'approval',
                                    'sandbox', 'artifact', 'choose', 'auth'):
            return p[0] + '_' + p[1]
        return p[0]

    ug = collections.Counter(prefix(k) for k in uncovered_keys if not is_sdk(k))
    print('\n=== 未覆盖业务命名空间 TOP35（真实差距所在）===')
    for p, c in ug.most_common(35):
        print(f'{p:34s} {c}')

    # 5. 未覆盖业务键样例（每空间 1 个）
    print('\n=== 未覆盖样例 ===')
    seen = set()
    for k in sorted(uncovered_keys):
        if is_sdk(k):
            continue
        p = prefix(k)
        if p not in seen:
            seen.add(p)
            print(f'{k:48s} = {(key2zh.get(k) or key2val[k])[:40]!r}')

    # 6. 演示页屏结构（可选）
    if os.path.exists(demo_path):
        dhtml = open(demo_path, encoding='utf-8', errors='replace').read()
        frames = re.findall(r'class="phone[^"]*"[^>]*>', dhtml)
        titles = re.findall(r'<h[23][^>]*>([^<]{2,40})</h[23]>', dhtml)
        print(f'\n演示页 phone 框数: {len(frames)}; 标题: {titles[:12]}')


if __name__ == '__main__':
    main()
