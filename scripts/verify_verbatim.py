#!/usr/bin/env python3
"""移动端文案逐字对账：JS locale 字典值 vs strings.xml 权威值（zh-rCN + en 双语）。

解析三层：
  ① 大括号配对提取 `<locale>: {` 字典体（避免 zh 窗口跨到 en 被 en 覆盖）；
  ② 官方键名映射（scripts/official_keymap.txt，R.string → 运行时点键名 852 对）+ 实证映射表 MAP；
  ③ 全量模式下按后缀候选 + 值相似度（阈值 0.6）模糊配对。

⚠ 模糊配对存在误配风险（详见 docs/coverage-audit.md 2.x），新增键对账结果需人工复核。

用法：
  python3 scripts/verify_verbatim.py [--all] [--res <apktool 输出的 res 目录>] [--js <qoder-mobile.js>]

默认路径相对仓库根：res = mobile/apktool-out/res（反编译产物不入库，需自行 apktool 反编译官方
APK 获得；开发机上亦可用 --res /home/z/my-project/mobile/apktool-out/res 指定）。
"""
import argparse
import difflib
import html
import os
import re

# 实证映射表（JS 点键 → APK 下划线键；官方键名与直觉命名不一致的条目）
MAP = {
    'settings.github_title': 'settings_integrations_github_title',
    'settings.github_connect': 'settings_integrations_github_connect',
    'settings.github_connected': 'settings_integrations_github_connected',
    'settings.github_connecting': 'settings_integrations_github_connecting',
    'settings.github_disconnect': 'settings_integrations_github_disconnect',
    'settings.github_disconnecting': 'settings_integrations_github_disconnecting',
    'settings.github_disconnected': 'settings_integrations_github_disconnected',
    'settings.github_loading': 'settings_integrations_github_loading',
    'settings.github_configure': 'settings_integrations_github_configure',
    'settings.github_disconnect_confirm_title': 'settings_integrations_disconnect_confirm_title',
    'settings.github_disconnect_confirm_message': 'settings_integrations_disconnect_confirm_message',
    'settings.integrations_title': 'settings_integrations_title',
    'settings.device_qr': 'settings_device_qr_accessibility',
    'settings.update.installer_unavailable': 'settings_update_install_installer_unavailable',
    'settings.update.package_access_failed': 'settings_update_install_package_access_failed',
    'settings.update.package_unavailable': 'settings_update_install_package_unavailable',
    'settings.update.permission_required': 'settings_update_install_permission_required',
    'settings.update.system_blocked': 'settings_update_install_system_blocked',
    'settings.update.download_again': 'settings_update_action_download_again',
    'settings.update.open_settings': 'settings_update_action_open_settings',
    'settings.update.try_again': 'settings_update_action_try_again',
    'tasks.rc.guidance.intro': 'tasks_rc_guidance_cli_intro',
    'artifact.share_restricted': 'artifact_share_restricted_by_organization',
    'approval.title.mcp': 'approval_title_execute_mcp',
    # 逐字复跑裁决增补（2026-09-04）：模糊配对曾误配到无关键，以下为实证正确权威键
    # settings_update_action_try_again APK en='Try again'（曾误配 choose_environment_connect_qoderwork_try_again='Retry'）
    'update.action.try_again': 'settings_update_action_try_again',
    # tasks_tab_running APK en='Running'（official_keymap.txt:157；曾误配 tasks_section_running='In Progress'）
    'tasks.filter.running': 'tasks_tab_running',
    # tasks_tab_idle APK en='Idle'（official_keymap.txt:158；排序平分时曾配到 tasks_phase_idle='idle'）
    'tasks.filter.idle': 'tasks_tab_idle',
    # tool_group_read_files APK zh='读取 %d 个文件' 与 JS zh 全同（official_keymap.txt:696）；en 'Read %d Files' 为权威，JS 已修正大小写
    'tool.group.files': 'tool_group_read_files',
}

# 自拟键（无 APK 静态对应，见 docs/coverage-audit.md §4.2）：Tab 标签在 Compose 代码硬编码，
# 模糊配对会误配到值相近的无关键（如 app.tab.tasks→tasks_switcher_all_tasks、
# new_task.tab.cloud→choose_environment_cloud），对账时直接剔除
SELF_MADE_PREFIXES = ('app.tab.', 'new_task.tab.')

# 默认校验域（--all 则扩展为全量键）
FAMILIES = ('approval.', 'artifact.', 'common.', 'error.', 'settings.', 'tasks.rc.')


def repo_root():
    return os.path.dirname(os.path.dirname(os.path.abspath(__file__)))


def parse_strings(path):
    txt = open(path, encoding='utf-8').read()
    out = {}
    for m in re.finditer(r'<string name="([^"]+)">(.*?)</string>', txt, re.S):
        name, val = m.group(1), m.group(2)
        val = val.replace("\\'", "'").replace('\\"', '"').replace('\\n', ' ')
        val = re.sub(r'\s+', ' ', html.unescape(val)).strip()
        out[name] = val
    return out


def extract_block(js, locale):
    """定位 `<locale>: {` 后做大括号配对，精确取该 locale 字典体"""
    m = re.search(r'(?:^|[,\s])' + locale + r':\s*\{', js, re.M)
    if not m:
        return ''
    i = m.end() - 1  # 指向 '{'
    depth = 0
    for j in range(i, len(js)):
        c = js[j]
        if c == '{':
            depth += 1
        elif c == '}':
            depth -= 1
            if depth == 0:
                return js[i + 1:j]
    return ''


def parse_js_dict(js, locale):
    body = extract_block(js, locale)
    out = {}
    # 单引号或双引号 JS 字符串值
    for km in re.finditer(r"'([a-z0-9_.]+)':\s*('(?:[^'\\]|\\.)*'|\"(?:[^\"\\]|\\.)*\")", body):
        raw = km.group(2)
        if raw[0] == "'":
            val = raw[1:-1].replace("\\'", "'").replace('\\\\', '\\').replace('\\"', '"')
        else:
            val = raw[1:-1].replace('\\"', '"').replace('\\\\', '\\')
        val = re.sub(r'\s+', ' ', val).strip()
        out[km.group(1)] = val
    return out


def norm(s):
    s = re.sub(r'%\d+\$[sd]', '%@', s)
    s = re.sub(r'%[sd]', '%@', s)
    return re.sub(r'\s+', ' ', s).strip()


def main():
    root = repo_root()
    ap = argparse.ArgumentParser(description='移动端文案逐字对账（双语）')
    ap.add_argument('--all', action='store_true', help='全量键对账（默认仅 FAMILIES 域）')
    ap.add_argument('--res', default=os.path.join('mobile', 'apktool-out', 'res'),
                    help='apktool 反编译输出的 res 目录')
    ap.add_argument('--js', default=os.path.join('src', 'qoder-mobile.js'), help='复现实现 JS 文件')
    a = ap.parse_args()

    res_dir = a.res if os.path.isabs(a.res) else os.path.join(root, a.res)
    js_path = a.js if os.path.isabs(a.js) else os.path.join(root, a.js)

    zh_apk = parse_strings(os.path.join(res_dir, 'values-zh-rCN', 'strings.xml'))
    en_apk = parse_strings(os.path.join(res_dir, 'values', 'strings.xml'))
    js = open(js_path, encoding='utf-8').read()
    zh_js = parse_js_dict(js, 'zh')
    en_js = parse_js_dict(js, 'en')
    print(f'解析: zh {len(zh_js)} 键 / en {len(en_js)} 键')

    def find_apk(key):
        if key in MAP:
            return MAP[key]
        c = key.replace('.', '_')
        if c in zh_apk or c in en_apk:
            return c
        return None

    def find_apk_fuzzy(key, jsd):
        """全量模式：点转下划线 → MAP → 后缀/子串候选 + 值相似度判定"""
        if key in MAP:
            return MAP[key]
        c = key.replace('.', '_')
        if c in zh_apk or c in en_apk:
            return c
        # 后缀候选：JS 键最后一段在 APK 键名尾部（sorted 保证确定性，避免 set 哈希序随机）
        tail = key.split('.')[-1]
        cands = sorted({n for n in set(list(zh_apk) + list(en_apk))
                        if n.endswith('_' + tail) or n == tail})
        # 值相似度判定（zh 或 en 任一 > 0.6 视为同一条目）
        best, best_r = None, 0.0
        for n in cands:
            r = 0.0
            if n in zh_apk and key in jsd:
                r = max(r, difflib.SequenceMatcher(None, norm(jsd[key]), norm(zh_apk[n])).ratio())
            if n in en_apk and key in jsd:
                r = max(r, difflib.SequenceMatcher(None, norm(jsd[key]), norm(en_apk[n])).ratio())
            if r > best_r:
                best, best_r = n, r
        return best if best_r > 0.6 else None

    keys = sorted(set(list(zh_js) + list(en_js))) if a.all else \
        sorted(k for k in zh_js if k.startswith(FAMILIES))

    drift, missing_apk, ok, self_made = [], [], 0, []
    for k in keys:
        if k.startswith(SELF_MADE_PREFIXES):
            self_made.append(k)
            continue
        apk_key = find_apk_fuzzy(k, zh_js) if a.all else find_apk(k)
        if not apk_key:
            missing_apk.append(k)
            continue
        if a.all:
            print(f'  [pair] {k}  →  {apk_key}')
        for loc, jsd, apkd in (('zh', zh_js, zh_apk), ('en', en_js, en_apk)):
            if k not in jsd:
                drift.append((k, loc, 'JS 缺失', f'APK={apkd.get(apk_key, "")!r}'))
                continue
            if apk_key not in apkd:
                continue
            va, vb = norm(jsd[k]), norm(apkd[apk_key])
            if va != vb:
                ratio = difflib.SequenceMatcher(None, va, vb).ratio()
                drift.append((k, loc, f'相似度{ratio:.2f}', f'JS={jsd[k]!r}  APK={apkd[apk_key]!r}'))
            else:
                ok += 1

    print(f'校验键数: {len(keys)}  逐字一致(zh+en 合计): {ok}  自拟键剔除: {len(self_made)}')
    if missing_apk:
        print(f'\n[未在 APK 找到对应键 {len(missing_apk)} 条]:')
        for k in missing_apk:
            print('  -', k)
    if drift:
        print(f'\n[漂移 {len(drift)} 条]:')
        for k, loc, r, d in drift:
            print(f'  - {k} ({loc}) {r}\n      {d}')
    else:
        print('全部逐字一致 ✓')


if __name__ == '__main__':
    main()
