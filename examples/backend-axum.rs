/* ============================================================
   Qoder UI 协议 v1 — Rust (axum) 参考后端
   ------------------------------------------------------------
   与 examples/backend-demo.mjs（Node 版）实现完全相同的协议，
   前端零改动即可切换：cargo run 之后在页面「后端连接器」选 REST 填
   http://localhost:8790/api

   Cargo.toml 依赖：
   ─────────────────────────────────────────────
   [dependencies]
   axum = "0.7"
   tokio = { version = "1", features = ["full"] }
   serde = { version = "1", features = ["derive"] }
   serde_json = "1"
   futures = "0.3"
   tower-http = { version = "0.5", features = ["cors"] }
   ─────────────────────────────────────────────

   端点：
     POST /api/chat      → SSE：chat.delta / chat.done 信封
     POST /api/terminal  → JSON：stdout / stderr / exitCode / cwd
     GET  /api/health    → {"ok":true}
   ============================================================ */

use axum::{
    extract::State,
    response::sse::{Event, KeepAlive, Sse},
    routing::{get, post},
    Json, Router,
};
use futures::stream::Stream;
use serde::{Deserialize, Serialize};
use std::{
    convert::Infallible,
    path::{Path, PathBuf},
    sync::Arc,
    time::{SystemTime, UNIX_EPOCH},
};
use tower_http::cors::CorsLayer;

/* ---------- 协议 v1 信封 ---------- */
#[derive(Serialize, Deserialize, Clone)]
struct Envelope {
    v: u8,
    id: String,
    #[serde(rename = "type")]
    kind: String,
    channel: Option<String>,
    payload: serde_json::Value,
    ts: u64,
}

fn envelope(kind: &str, payload: serde_json::Value, channel: Option<String>) -> Envelope {
    Envelope {
        v: 1,
        id: format!("e_{}", now_ms()),
        kind: kind.into(),
        channel,
        payload,
        ts: now_ms(),
    }
}

fn now_ms() -> u64 {
    SystemTime::now().duration_since(UNIX_EPOCH).unwrap().as_millis() as u64
}

/* ---------- POST /api/chat —— 流式回声（替换成你的 LLM 调用即可） ---------- */
#[derive(Deserialize)]
struct ChatBody {
    payload: ChatPayload,
}

#[derive(Deserialize)]
struct ChatPayload {
    #[serde(default)]
    id: String,
    #[serde(default)]
    text: String,
}

async fn chat(
    axum::extract::Json(body): axum::Json<ChatBody>,
) -> Sse<impl Stream<Item = Result<Event, Infallible>>> {
    let msg_id = if body.payload.id.is_empty() {
        format!("chat_{}", now_ms())
    } else {
        body.payload.id.clone()
    };

    // TODO: 在这里接入你的 LLM / Agent 服务，把 token 逐段 yield 成 chat.delta
    let reply = format!(
        "【Rust axum 演示后端】收到 {} 个字符：\"{}\"。\n\n\
         本回复由 SSE 流式传输，信封协议与 Node 演示后端完全一致。\n\
         前端无需任何改动 —— 这就是 Transport 层的意义。",
        body.payload.text.chars().count(),
        body.payload.text
    );

    let stream = futures::stream::unfold((reply, 0usize, msg_id, false), |(reply, pos, msg_id, done)| async move {
        if done {
            return None;
        }
        let chars: Vec<char> = reply.chars().collect();
        if pos >= chars.len() {
            let env = envelope(
                "chat.done",
                serde_json::json!({ "id": msg_id, "finishReason": "stop" }),
                Some("chat".into()),
            );
            let event = Event::default().data(serde_json::to_string(&env).unwrap());
            return Some((Ok(event), (reply, pos, msg_id, true)));
        }
        let step: usize = 3;
        let end = (pos + step).min(chars.len());
        let delta: String = chars[pos..end].iter().collect();
        let env = envelope(
            "chat.delta",
            serde_json::json!({ "id": msg_id, "delta": delta }),
            Some("chat".into()),
        );
        let event = Event::default().data(serde_json::to_string(&env).unwrap());
        tokio::time::sleep(std::time::Duration::from_millis(20)).await;
        Some((Ok(event), (reply, end, msg_id, false)))
    });

    Sse::new(stream).keep_alive(KeepAlive::default())
}

/* ---------- POST /api/terminal —— 白名单沙箱命令 ---------- */
#[derive(Deserialize)]
struct TermBody {
    payload: TermPayload,
}

#[derive(Deserialize)]
struct TermPayload {
    #[serde(default)]
    tab_id: Option<String>,
    #[serde(default, rename = "tabId")]
    tab_id_camel: Option<String>,
    #[serde(default)]
    cmd: String,
    #[serde(default)]
    cwd: String,
}

// v3.3.1 审计修复（M3）：协议 v1 字段为 camelCase（exitCode/tabId），
// 此前按 Rust 默认 snake_case 序列化，前端读不到 exitCode（恒为 0）
#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct TermResult {
    #[serde(skip_serializing_if = "Option::is_none")]
    tab_id: Option<String>,
    #[serde(default)]
    stdout: String,
    #[serde(default)]
    stderr: String,
    exit_code: i32,
    #[serde(default)]
    cwd: String,
}

const ALLOWED: &[&str] = &["ls", "pwd", "echo", "date", "whoami", "cat", "head", "wc"];

async fn terminal(
    State(sandbox): State<Arc<PathBuf>>,
    axum::extract::Json(body): axum::Json<TermBody>,
) -> Json<serde_json::Value> {
    let p = body.payload;
    let tab_id = p.tab_id.or(p.tab_id_camel);
    let cwd_abs = resolve_cwd(&sandbox, &p.cwd);

    // 沙箱越界防护
    let cwd_abs = match cwd_abs {
        Some(c) if c.starts_with(sandbox.as_path()) => c,
        _ => {
            let r = TermResult { tab_id, stdout: String::new(), stderr: "cd: 越界：沙箱限定内".into(), exit_code: 1, cwd: p.cwd };
            return Json(serde_json::to_value(r).unwrap());
        }
    };

    let parts: Vec<&str> = p.cmd.split_whitespace().collect();
    let bin = parts.first().copied().unwrap_or("");

    let result = if !ALLOWED.contains(&bin) {
        TermResult {
            tab_id,
            stdout: String::new(),
            stderr: format!("command not found（白名单：{}）: {}", ALLOWED.join(" "), bin),
            exit_code: 127,
            cwd: p.cwd.clone(),
        }
    } else if parts[1..].iter().any(|a| a.contains("..") || a.starts_with('/')) {
        TermResult {
            tab_id,
            stdout: String::new(),
            stderr: "blocked: 参数超出沙箱范围".into(),
            exit_code: 1,
            cwd: p.cwd.clone(),
        }
    } else {
        // 处理 cd：后端维护目录并回传新 cwd
        if bin == "cd" {
            let arg = parts.get(1).copied().unwrap_or("");
            let target = if arg.is_empty() || arg == "~" {
                sandbox.to_path_buf()
            } else {
                cwd_abs.join(arg)
            };
            let new_cwd = if target == sandbox { "~".to_string() } else {
                target.strip_prefix(sandbox.as_path()).map(|s| format!("/{}", s.to_string_lossy())).unwrap_or_else(|_| "~".into())
            };
            TermResult { tab_id, stdout: String::new(), stderr: String::new(), exit_code: 0, cwd: new_cwd }
        } else {
            let out = tokio::process::Command::new(bin)
                .args(&parts[1..])
                .current_dir(&cwd_abs)
                .output()
                .await
                .unwrap_or_default();
            TermResult {
                tab_id,
                stdout: String::from_utf8_lossy(&out.stdout).into_owned(),
                stderr: String::from_utf8_lossy(&out.stderr).into_owned(),
                exit_code: out.status.code().unwrap_or(0),
                cwd: p.cwd.clone(),
            }
        }
    };

    Json(serde_json::to_value(result).unwrap())
}

fn resolve_cwd(sandbox: &Path, cwd: &str) -> Option<PathBuf> {
    if cwd.is_empty() || cwd == "~" || cwd == "/" {
        return Some(sandbox.to_path_buf());
    }
    let rel = cwd.trim_start_matches('~').trim_start_matches('/');
    let target = sandbox.join(rel);
    Some(target)
}

async fn health() -> Json<serde_json::Value> {
    Json(serde_json::json!({ "ok": true, "protocol": 1, "name": "qoder-axum-backend" }))
}

#[tokio::main]
async fn main() {
    let sandbox = Arc::new(std::env::current_dir().unwrap().join("sandbox"));
    tokio::fs::create_dir_all(sandbox.as_ref()).await.unwrap();

    let app = Router::new()
        .route("/api/chat", post(chat))
        .route("/api/terminal", post(terminal))
        .route("/api/health", get(health))
        .with_state(sandbox)
        .layer(CorsLayer::permissive()); // 演示全开；生产请收敛 Allow-Origin

    let port: u16 = std::env::var("PORT").ok().and_then(|p| p.parse().ok()).unwrap_or(8790);
    let addr = format!("0.0.0.0:{port}");
    println!("Rust axum 演示后端: http://localhost:{port}/api");
    let listener = tokio::net::TcpListener::bind(&addr).await.unwrap();
    axum::serve(listener, app).await.unwrap();
}

/* ============================================================
   WebSocket 扩展提示（WSTransport 全双工模式）：

   use axum::extract::ws::{WebSocket, WebSocketUpgrade, Message};
   use futures::{SinkExt, StreamExt};

   async fn ws_handler(ws: WebSocketUpgrade) -> axum::response::Response {
       ws.on_upgrade(handle_socket)
   }

   async fn handle_socket(mut socket: WebSocket) {
       // 收 Envelope（serde_json）→ 按 kind 分发：
       //   chat.send      → 流式回 chat.delta / chat.done（payload.id 原样回传）
       //   chat.abort     → 取消对应 id 的生成任务
       //   terminal.input → 起 tokio::process shell 会话：
       //                    stdout → terminal.output，退出 → terminal.exit，
       //                    目录变化 → terminal.cwd（channel = terminal:<tabId>）
       while let Some(Ok(msg)) = socket.recv().await {
           if let Message::Text(txt) = msg {
               if let Ok(env) = serde_json::from_str::<Envelope>(&txt) {
                   // TODO: 分发处理，用 socket.send(Message::Text(json)) 回推信封
                   let _ = env;
               }
           }
       }
   }
   ============================================================ */
