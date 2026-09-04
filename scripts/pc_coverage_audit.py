#!/usr/bin/env python3
"""PC 端值匹配对账：官方 Qoder CN App（Electron）zh 字面量 ↔ 复现库 PC 侧 src/*.js。

两个方向（区别于移动端单向覆盖率审计）：
  A 覆盖率  —— 官方 zh UI 串中，多少已出现在复现库（复现完整性）
  B 自造率  —— 复现库 zh 串中，多少在官方包中找不到（忠实度风险：自造文案）

口径：
  - 官方侧 = 渲染层主包 + 主进程 out/main/index.js + dynamic-text/qoder-cn.json
  - 仅取含 CJK 的字面量（zh 是权威语言，en 串与代码标识符无法区分，噪音过大）
  - 状态机提取（'/"/` 三类字面量；模板串含 ${ 则跳过；跳过注释）
  - 规范化：反转义 + 空白折叠；aggressive 规范化再剥离全部空白与中英标点（治漂移）

用法（详见 docs/pc-coverage-audit.md §八复跑指南）：
  python3 scripts/pc_coverage_audit.py [--official <官方 js/json>...] [--src-dir <src>] [--out <目录>]

官方反编译产物不入库（与移动端 apktool-out 同约定）：默认路径相对仓库根 pc/asar_x/、
pc/app_x/，需按报告 §八 先下载解包；明细数据快照已入库 docs/pc-audit-data.json。
"""
import argparse
import json
import os
import re

CJK = re.compile(r'[\u4e00-\u9fff]')


def repo_root():
    """脚本位于 <repo>/scripts/ 下，返回仓库根。"""
    return os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

# ---------------- 字面量状态机提取 ----------------

def extract_literals(js):
    """从 JS 源码提取字符串字面量原文（含引号内原始转义），跳过注释与正则。"""
    lits = []
    i, n = 0, len(js)
    NORMAL, SQ, DQ, BT, LC, BC = range(6)
    st = NORMAL
    buf = []
    brace_depth = []  # 模板串 ${ 嵌套
    while i < n:
        c = js[i]
        if st == NORMAL:
            if c == "'":
                st, buf = SQ, []
            elif c == '"':
                st, buf = DQ, []
            elif c == '`':
                st, buf = BT, []
            elif c == '/' and i + 1 < n and js[i + 1] == '/':
                st = LC
                i += 1
            elif c == '/' and i + 1 < n and js[i + 1] == '*':
                st = BC
                i += 1
        elif st in (SQ, DQ):
            if c == '\\' and i + 1 < n:
                buf.append(c)
                buf.append(js[i + 1])
                i += 2
                continue
            if (st == SQ and c == "'") or (st == DQ and c == '"'):
                lits.append(''.join(buf))
                st = NORMAL
            else:
                buf.append(c)
        elif st == BT:
            if c == '\\' and i + 1 < n:
                buf.append(c)
                buf.append(js[i + 1])
                i += 2
                continue
            if c == '`':
                lits.append(''.join(buf))
                st = NORMAL
            elif c == '$' and i + 1 < n and js[i + 1] == '{':
                # 含插值的模板串：整体放弃（无法安全重建），跳到配对 }
                depth = 1
                i += 2
                while i < n and depth:
                    if js[i] == '{':
                        depth += 1
                    elif js[i] == '}':
                        depth -= 1
                    elif js[i] in '\'"`':
                        # 插值内嵌字符串：同步跳过
                        q = js[i]
                        i += 1
                        while i < n:
                            if js[i] == '\\':
                                i += 2
                                continue
                            if js[i] == q:
                                break
                            i += 1
                    i += 1
                continue
            else:
                buf.append(c)
        elif st == LC:
            if c == '\n':
                st = NORMAL
        elif st == BC:
            if c == '*' and i + 1 < n and js[i + 1] == '/':
                st = NORMAL
                i += 1
        i += 1
    return lits


UNESCAPES = [(r'\n', ' '), (r'\t', ' '), (r'\r', ' '), (r"\'", "'"), (r'\"', '"'),
             (r'\\', '\\'), (r'\`', '`')]


def unescape(s):
    # \uXXXX 与 \u{...}
    s = re.sub(r'\\u\{([0-9a-fA-F]{1,6})\}', lambda m: chr(int(m.group(1), 16)), s)
    s = re.sub(r'\\u([0-9a-fA-F]{4})', lambda m: chr(int(m.group(1), 16)), s)
    for a, b in UNESCAPES:
        s = s.replace(a, b)
    return s


def norm(s):
    s = unescape(s)
    s = re.sub(r'\s+', ' ', s).strip()
    return s


AGGR_STRIP = re.compile(r'[\s，。！？、；：·\-—_~～…!?,.;:\'"(){}\[\]<>|/\\@$#%^&*+=“”‘’《》【】]')


def aggr(s):
    return AGGR_STRIP.sub('', s)


# 官方侧：i18next 资源以 key:"value" 扁平对存储（minified），键为 camelCase 标识符
KV_RE = re.compile(
    r'[,{\[]\s*([A-Za-z_$][A-Za-z0-9_$]*)\s*:\s*(["\'])((?:[^\'"\\]|\\.)*)\2')
# 复现侧：t('...') / t("...") 的 UI 串包裹调用
T_CALL_RE = re.compile(r'\bt\(\s*(["\'])((?:[^\'"\\]|\\.)*)\1')
HTML_TAG_RE = re.compile(r'<[^<>]{0,200}>')


def official_inventory(js):
    """官方侧 zh UI 串盘点：key:value 对 + 非反引号 zh 字面量。返回 dict key->value 与值集合。"""
    kv, vals = {}, set()
    for m in KV_RE.finditer(js):
        k, raw = m.group(1), m.group(3)
        v = norm(raw)
        if v and CJK.search(v) and len(v) <= 300:
            kv.setdefault(k, v)
            vals.add(v)
    for raw in extract_literals(js):
        v = norm(raw)
        if v and CJK.search(v) and len(v) <= 300:
            vals.add(v)
    return kv, vals


def repro_inventory(js):
    """复现侧 zh UI 串盘点：t() 参数 + 引号字面量 + 模板串去标签后的文本节点。"""
    vals = set()
    for m in T_CALL_RE.finditer(js):
        v = norm(m.group(2))
        if v and CJK.search(v):
            vals.add(v)
    # 反引号模板串（可能含 HTML）：整块捕获后剥标签，文本节点拆分为候选
    for raw in extract_literals(js):
        v = norm(raw)
        if not v or not CJK.search(v):
            continue
        vals.add(v)
        if '`' in raw or '<' in raw:
            text = HTML_TAG_RE.sub('\n', raw)
            for seg in text.split('\n'):
                sv = norm(seg)
                if not sv or not CJK.search(sv):
                    continue
                if sv.startswith('//') or sv.startswith('/*'):
                    continue  # 嵌入代码片段中的注释
                vals.add(sv)
    return vals


# ---------------- 主流程 ----------------

def main():
    ap = argparse.ArgumentParser(description='PC 端双向值匹配对账')
    ap.add_argument('--official', nargs='+', default=[
        os.path.join('pc', 'asar_x', 'out', 'renderer', 'assets', 'index-BRjCpkei.js'),
        os.path.join('pc', 'asar_x', 'out', 'main', 'index.js'),
        os.path.join('pc', 'app_x', 'opt', 'Qoder CN', 'resources', 'dynamic-text', 'qoder-cn.json')])
    ap.add_argument('--src-dir', default=os.path.join('src', ''),
                    help='复现库源码目录（默认 <repo>/src，自动剔除 qoder-mobile.js）')
    ap.add_argument('--exclude', nargs='+', default=['qoder-mobile.js'])
    ap.add_argument('--out', default=os.path.join('pc', 'audit_out'))
    a = ap.parse_args()
    root = repo_root()
    a.official = [p if os.path.isabs(p) else os.path.join(root, p) for p in a.official]
    a.src_dir = a.src_dir if os.path.isabs(a.src_dir) else os.path.join(root, a.src_dir)
    a.out = a.out if os.path.isabs(a.out) else os.path.join(root, a.out)

    os.makedirs(a.out, exist_ok=True)

    # 官方侧盘点（key -> value 映射 + 值集合）
    off_kv, off = {}, set()
    for f in a.official:
        if f.endswith('.json'):
            d = json.load(open(f, encoding='utf-8'))
            flat = {}
            for lang in d.values():
                if isinstance(lang, dict):
                    flat.update(lang)
            zh_n = 0
            for k, raw in flat.items():
                v = norm(str(raw))
                if v and CJK.search(v):
                    off_kv.setdefault(k, v)
                    off.add(v)
                    zh_n += 1
            print(f'官方 {os.path.basename(f)}: {zh_n} zh 键')
            continue
        js = open(f, encoding='utf-8', errors='ignore').read()
        kv, vals = official_inventory(js)
        for k, v in kv.items():
            off_kv.setdefault(k, v)
        off |= vals
        print(f'官方 {os.path.basename(f)}: key:value zh {len(kv)}，值去重累计 {len(off)}')
    print(f'官方 zh UI 值集合（去重）: {len(off)}（含键名映射 {len(off_kv)} 条）')
    off_aggr = {aggr(v): v for v in off}
    off_aggr_multiple = len(off) - len(off_aggr)

    # 复现侧盘点
    files = sorted(f for f in os.listdir(a.src_dir) if f.endswith('.js')
                   and f not in a.exclude)
    rep = set()
    for f in files:
        js = open(os.path.join(a.src_dir, f), encoding='utf-8', errors='ignore').read()
        vals = repro_inventory(js)
        print(f'复现 {f}: zh 候选 {len(vals)}')
        rep |= vals
    print(f'复现 zh 候选集合（去重）: {len(rep)}')
    rep_aggr = {aggr(v): v for v in rep}

    # A 方向：覆盖率（官方 → 复现）
    exact_covered = {v for v in off if v in rep}
    aggr_covered = {v for v in off if v not in rep and aggr(v) in rep_aggr}
    uncovered = sorted(off - exact_covered - aggr_covered)
    print(f'\n[A 覆盖率] 官方 zh 值 {len(off)}：精确 {len(exact_covered)} '
          f'({len(exact_covered)/len(off)*100:.1f}%)，aggressive {len(aggr_covered)}，'
          f'未覆盖 {len(uncovered)} ({len(uncovered)/len(off)*100:.1f}%)')

    # B 方向：自造率（复现 → 官方）
    exact_hit = {v for v in rep if v in off}
    aggr_hit = {v for v in rep if v not in off and aggr(v) in off_aggr}
    selfmade = sorted(rep - exact_hit - aggr_hit)
    print(f'[B 自造率] 复现 zh 值 {len(rep)}：官方可证 {len(exact_hit) + len(aggr_hit)} '
          f'({(len(exact_hit)+len(aggr_hit))/len(rep)*100:.1f}%)，'
          f'官方未检出 {len(selfmade)} ({len(selfmade)/len(rep)*100:.1f}%)')

    # 未覆盖官方键分组（有键名的只报键名，便于归因）
    unc_keys = sorted(k for k, v in off_kv.items()
                      if v not in exact_covered and v not in aggr_covered)
    json.dump({'uncovered_official': uncovered,
               'uncovered_keys': unc_keys,
               'selfmade_repro': selfmade,
               'stats': {'official_zh': len(off), 'official_kv': len(off_kv),
                         'aggr_collisions': off_aggr_multiple,
                         'repro_zh': len(rep),
                         'covered_exact': len(exact_covered),
                         'covered_aggr': len(aggr_covered),
                         'repro_verified': len(exact_hit) + len(aggr_hit)}},
              open(os.path.join(a.out, 'pc_audit.json'), 'w', encoding='utf-8'),
              ensure_ascii=False, indent=1)
    print(f'\n明细已写 {a.out}/pc_audit.json（未覆盖 {len(uncovered)} 条 / 自造候选 {len(selfmade)} 条）')


if __name__ == '__main__':
    main()
