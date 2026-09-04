#!/usr/bin/env python3
"""pc_cloud_audit.py — Qoder 桌面端（App / IDE）云端控制面协议审计

从反编译产物中提取可复验的协议证据，输出机器可读 JSON：
  1) endpoints   — 全部 API 端点字面量（/api/v*、/sash/*、loop-server /v1/*）
  2) urls        — 全部硬编码 URL（按域分组）
  3) env_vars    — QODER_* 环境变量注入面（QODER_SERVER_BASE_URL 等）
  4) constants   — 协议常量核对表（心跳间隔/SSE 参数/turn 状态机/协议族枚举…）
  5) ide_signals — IDE 侧交叉验证信号（深链 scheme、remote/environments…）

用法:
  python3 scripts/pc_cloud_audit.py                    # 默认路径
  python3 scripts/pc_cloud_audit.py --out docs/pc-cloud-audit.json

默认反编译产物路径（均不入库，见 docs/pc-coverage-audit.md §八 复跑指南）:
  App: pc/asar_x/out/main/index.js                     (asar 解包)
  IDE: pc/ide_x/usr/share/qoder-cn-ide/resources/app/out  (deb 解包)
"""

import argparse
import json
import os
import re
import sys
from collections import Counter
from datetime import datetime, timezone

DEFAULT_APP = "pc/asar_x/out/main/index.js"
DEFAULT_IDE = "pc/ide_x/usr/share/qoder-cn-ide/resources/app/out"

# ---------------------------------------------------------------------------
# 提取规则
# ---------------------------------------------------------------------------

# 端点字面量：覆盖 openapi /api/vN/*、sash 前缀、loop-server /v1/* 相对路径
ENDPOINT_RE = re.compile(
    r"""(?x)
    (?:
        /(?:sash/)?api/v\d+/[A-Za-z0-9/_\-]+          # /api/v1/... 与 /sash/api/v1/...
      | (?:"|`)/v\d+/[A-Za-z0-9/_${}\-]+              # loop-server 相对路径 "/v1/..."
    )
    """
)

# loop-server 动态段（模板串）单独归类，如 /v1/runtime-installations/${id}/heartbeat
LOOP_DYN_RE = re.compile(r"/v\d+/[A-Za-z0-9/_\-]*(?:\$|encodeURIComponent)")

URL_RE = re.compile(r"https?://[A-Za-z0-9.\-]+(?:\.[a-z]{2,})(?::\d+)?(?:/[A-Za-z0-9._\-/?=&%]*)?")

ENV_RE = re.compile(r"\bQODER_[A-Z_]{2,}\b")

# 协议常量核对表：name -> (regex, 说明)；逐项判定存在性与命中次数
CONSTANTS = {
    # --- 移动端共享：网关/实时通道 ---
    "sse_header_last_event_id":      (r"Last-Event-ID", "SSE 重放头（移动端与 loop-server 双侧一致）"),
    "sse_accept":                    (r"text/event-stream", "SSE Accept"),
    "sse_event_deltas":              (r"event_deltas\[\]", "Qoder Cloud 会话流增量过滤参数"),
    "sse_heartbeat_event":           (r'event: heartbeat|==="heartbeat"', "SSE 心跳事件帧"),
    "gw_route_token":                (r"X-GwRoute-Token|X-Gw-User-Id", "网关路由头族：移动端存在、桌面 App 无（阴性对照 = 桌面不直连移动网关）"),
    # --- 认证凭证链 ---
    "device_token_poll":             (r"/api/v1/deviceToken/poll", "OAuth Device Flow 轮询（S256）"),
    "device_token_refresh":          (r"/api/v1/deviceToken/refresh", "设备令牌刷新"),
    "device_flow_challenge_s256":    (r"challenge_method.{0,12}S256|S256", "PKCE S256 挑战"),
    "job_token_exchange":            (r"/api/v1/jobToken/exchange", "PAT 换 jobToken"),
    "job_token_me":                  (r"/api/v1/me/jobToken", "账号签发 jobToken"),
    "job_token_refresh":             (r"/api/v1/jobToken/refresh", "jobToken 刷新"),
    # --- loop-server 控制面（协作） ---
    "loop_runtime_install_register": (r"/v1/runtime-installations/register", "Runtime 安装注册"),
    "loop_runtime_install_hb":       (r"/v1/runtime-installations/.{0,40}/heartbeat", "Runtime 心跳（安卓端 last_heartbeat_at 的桌面源头）"),
    "loop_runtime_install_dereg":    (r"/v1/runtime-installations/.{0,40}/deregister", "Runtime 注销"),
    "loop_runtime_reconcile":        (r"/v1/runtime-installations/.{0,40}/registrations", "注册对账（PUT）"),
    "loop_runtime_registrations":    (r"/v1/runtime-registrations(?!/)", "注册列表"),
    "loop_runtime_profiles":         (r"/v1/runtime-profiles", "Runtime Profile 列表"),
    "loop_runtime_targets":          (r"/v1/agent-runtime-targets", "Agent 运行目标"),
    "loop_turns_claim":              (r"/v1/runtime-registrations/.{0,40}/turns/claim", "拉取式派单（204=无任务）"),
    "loop_turns_patch":              (r"/v1/turns/.{0,40}(?:/)?", "Turn 回传（PATCH status/result）"),
    "loop_runtime_bindings":         (r"/v1/sessions/.{0,40}/runtime-bindings", "会话↔Runtime 绑定"),
    "loop_execution_plane":          (r"executionPlaneKind|client-managed", "执行面类型（client-managed）"),
    "loop_idempotency_key":          (r"Idempotency-Key", "幂等键"),
    "loop_if_match":                 (r"If-Match", "ETag 并发控制"),
    "loop_events_stream":            (r"/v1/events\?after=", "协作增量 SSE（after=cursor）"),
    "loop_event_collab":             (r"event: collaboration", "协作事件类型"),
    "loop_turn_states":              (r'"queued"|"starting"|"running"|"waiting-user"|"completed"|"failed"|"canceled"|"interrupted"', "Turn 八态状态机"),
    "loop_protocol_family":          (r'"qoder"|"codex"|"pi"', "Agent 协议族枚举"),
    "loop_failure_codes":            (r"AUTH_REQUIRED|RUNTIME_EXECUTION_FAILED|EXECUTION_INTERRUPTED", "Turn 失败码三分类"),
    # --- 本地执行体 ---
    "agent_sdk_transport":           (r"WorkerTransport|ProcessTransport", "qoder-cn-agent-sdk 传输层"),
    "remote_host_hello":             (r"system\.hello|system\.ping", "Remote Host stdio 协议握手/心跳"),
    "remote_host_hb_15s":            (r"heartbeat.{0,80}15e3|15e3.{0,80}heartbeat", "Remote Host 心跳 15s 间隔"),
    "remote_host_timeout_45s":       (r"45e3", "Remote Host 心跳超时 45s"),
    "remote_ssh_runtime":            (r"remoteSsh|remote-runtime", "Remote-SSH runtime（thin/full）"),
    # --- Qoder Cloud（国际云沙箱） ---
    "cloud_api_base":                (r"api\.qoder\.com/api/v1/cloud", "国际云 Cloud Agent 基址"),
    "cloud_user_message":            (r"user\.message", "会话事件：用户消息"),
    "cloud_tool_confirm":            (r"user\.tool_confirmation", "会话事件：工具确认（tool_use_id）"),
    "cloud_session_cancel":          (r"/sessions/.{0,40}/cancel", "会话取消"),
    "cloud_agent_toolset":           (r"agent_toolset_\d+", "Agent 工具集类型"),
    # --- 深链 ---
    "deeplink_accept":               (r"acceptUrl|acceptArgv", "深链入口（队列 20 条/600s 过期）"),
    "deeplink_open_url":             (r'"open-url"', "Electron open-url 事件"),
    "deeplink_second_instance":      (r'"second-instance"', "Windows/Linux argv 深链"),
    # --- 配置注入 ---
    "env_server_base_url":           (r"QODER_SERVER_BASE_URL", "loop-server 地址环境变量（自建后端官方入口）"),
    "env_openapi_base_url":          (r"QODER_OPENAPI_BASE_URL", "openapi 基址覆盖"),
    "env_telemetry_base_url":        (r"QODER_TELEMETRY_BASE_URL", "遥测基址覆盖"),
    "env_demo_data":                 (r"QODER_DEMO_DATA", "演示数据模式"),
}

# IDE 侧信号（在 IDE out/ 目录 grep）
IDE_SIGNALS = {
    "scheme_qoder_cn_handler":  ("qoder-cn", "IDE url-handler desktop 注册 qoder-cn:// 与 qoder-cn-ide://"),
    "remote_environments_api":  ("remote/environments", "会话执行环境列表（openapi）"),
    "sash_integrations":        ("sash/api/v1/me/integrations", "GitHub 集成端点（sash 域）"),
    "device_token":             ("deviceToken", "IDE 侧设备令牌"),
    "agents_window":            ("agents-window", "lingma agents 窗口（会话执行 UI）"),
}

DOMAIN_GROUPS = [
    ("openapi/gateway (CN 业务面)", r"^(openapi|gateway|test-openapi|test-gateway)\.qoder\.com\.cn$"),
    ("static/download (CN 包面)",   r"^(static|download)\.qoder\.com\.cn$"),
    ("IDE (CN)",                    r"^ide\.qoder\.com\.cn$"),
    ("Qoder Cloud (国际云)",        r"^api\.qoder\.com$"),
    ("collab/ops (sh)",             r"\.qoder\.sh$"),
    ("国际论坛/文档",                r"^(forum|docs)\.qoder\.com$"),
    ("阿里云外围",                  r"aliyuncs\.com$"),
]


def classify_host(host: str) -> str:
    for label, rx in DOMAIN_GROUPS:
        if re.search(rx, host):
            return label
    return "其他"


def extract_endpoints(text: str) -> dict:
    """端点字面量：静态路径归并，动态模板（含 ${…} / encodeURIComponent）单独归类。"""
    static, dynamic = Counter(), Counter()
    for m in ENDPOINT_RE.finditer(text):
        ep = m.group(0).strip('"`')
        if LOOP_DYN_RE.search(ep):
            # 归一化动态段：/v1/runtime-installations/${xx}/heartbeat -> …/{id}/heartbeat
            norm = re.sub(r"\$\{[^}]*\}|\$\{?encodeURIComponent\([^)]*\)\}?", "{id}", ep)
            dynamic[norm] += 1
        else:
            static[ep.rstrip("/")] += 1
    return {
        "static": dict(sorted(static.items(), key=lambda kv: (-kv[1], kv[0]))),
        "dynamic_templates": dict(sorted(dynamic.items(), key=lambda kv: (-kv[1], kv[0]))),
        "static_total": sum(static.values()),
        "dynamic_total": sum(dynamic.values()),
    }


def extract_urls(text: str) -> dict:
    hosts, full = Counter(), Counter()
    for m in URL_RE.finditer(text):
        u = m.group(0).rstrip("/.,")
        try:
            host = re.match(r"https?://([^/:]+)", u).group(1)
        except AttributeError:
            continue
        hosts[host] += 1
        full[u] += 1
    grouped = {}
    for host, n in hosts.most_common():
        grouped.setdefault(classify_host(host), []).append({"host": host, "hits": n})
    top = [{"url": u, "hits": n} for u, n in full.most_common(60)]
    return {"by_group": grouped, "top_full_urls": top, "host_total": sum(hosts.values())}


def extract_env(text: str) -> dict:
    c = Counter(m.group(0) for m in ENV_RE.finditer(text))
    return dict(sorted(c.items(), key=lambda kv: (-kv[1], kv[0])))


def check_constants(text: str) -> dict:
    out = {}
    for name, (rx, desc) in CONSTANTS.items():
        hits = re.findall(rx, text)
        out[name] = {"hits": len(hits), "present": bool(hits), "desc": desc}
    return out


def check_ide(ide_path: str) -> dict:
    signals = {}
    if not os.path.isdir(ide_path):
        for k, (_, desc) in IDE_SIGNALS.items():
            signals[k] = {"present": None, "hits": 0, "desc": desc}
        return signals
    # url-handler desktop 文件
    handler = None
    for root, _, files in os.walk("/".join(ide_path.split("/")[:-3] or [""])):
        pass
    probe_files = {
        "url_handler_desktop": "/home/z/my-project/pc/ide_x/usr/share/applications/qoder-cn-ide-url-handler.desktop",
    }
    handler_text = ""
    for p in probe_files.values():
        if os.path.isfile(p):
            handler_text = open(p, encoding="utf-8", errors="replace").read()
            break
    for root, dirs, files in os.walk(ide_path):
        for f in files:
            if not f.endswith((".js", ".cjs", ".mjs", ".desktop")):
                continue
            try:
                t = open(os.path.join(root, f), encoding="utf-8", errors="replace").read()
            except OSError:
                continue
            for k, (needle, _) in IDE_SIGNALS.items():
                if needle in t:
                    signals.setdefault(k, {"hits": 0, "desc": IDE_SIGNALS[k][1]})
                    signals[k]["hits"] += t.count(needle)
        dirs[:] = [d for d in dirs if d not in ("node_modules",)]
    for k, (_, desc) in IDE_SIGNALS.items():
        sig = signals.setdefault(k, {"hits": 0, "desc": desc})
        sig["present"] = bool(sig.get("hits"))
    if handler_text:
        schemes = re.findall(r"x-scheme-handler/([a-z\-]+)", handler_text)
        signals["url_handler_schemes"] = {"present": bool(schemes), "hits": len(schemes),
                                          "desc": "深链 scheme 清单", "schemes": schemes}
    return signals


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--app", default=DEFAULT_APP, help="App asar 主进程 index.js 路径")
    ap.add_argument("--ide", default=DEFAULT_IDE, help="IDE out 目录路径")
    ap.add_argument("--out", default="-", help="输出 JSON 路径（- = stdout）")
    args = ap.parse_args()

    # REPO = qoder-ui（输出基准）；PROD_BASE = 上一级（pc/ 反编译产物基准，不入库）
    repo = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    prod_base = os.path.dirname(repo)
    app_path = args.app if os.path.isabs(args.app) else os.path.join(prod_base, args.app)
    ide_path = args.ide if os.path.isabs(args.ide) else os.path.join(prod_base, args.ide)

    report = {"schema": "pc-cloud-audit/v1", "generated_at": datetime.now(timezone.utc).isoformat()}

    if os.path.isfile(app_path):
        text = open(app_path, encoding="utf-8", errors="replace").read()
        report["app"] = {
            "path": os.path.relpath(app_path, prod_base),
            "bytes": os.path.getsize(app_path),
            "endpoints": extract_endpoints(text),
            "urls": extract_urls(text),
            "env_vars": extract_env(text),
            "constants": check_constants(text),
        }
    else:
        report["app"] = None
        print(f"[warn] App 产物不存在: {app_path}", file=sys.stderr)

    report["ide"] = {"path": os.path.relpath(ide_path, prod_base) if os.path.isdir(ide_path) else ide_path,
                     "signals": check_ide(ide_path)}

    payload = json.dumps(report, ensure_ascii=False, indent=2)
    if args.out == "-":
        print(payload)
    else:
        out_path = args.out if os.path.isabs(args.out) else os.path.join(repo, args.out)
        os.makedirs(os.path.dirname(out_path), exist_ok=True)
        with open(out_path, "w", encoding="utf-8") as fh:
            fh.write(payload)
        # 摘要
        app = report["app"]
        if app:
            c = app["constants"]
            present = sum(1 for v in c.values() if v["present"])
            print(f"[ok] App: {app['bytes']:,}B  端点静态 {app['endpoints']['static_total']}"
                  f" + 动态模板 {app['endpoints']['dynamic_total']}"
                  f"  环境变量 {len(app['env_vars'])}  常量 {present}/{len(c)} 命中")
        ide_present = sum(1 for v in report["ide"]["signals"].values() if v.get("present"))
        print(f"[ok] IDE: 信号 {ide_present}/{len(report['ide']['signals'])} 命中")
        print(f"[ok] 写出 {out_path}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
