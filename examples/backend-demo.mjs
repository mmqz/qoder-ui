#!/usr/bin/env node
/* ============================================================
   Qoder UI 演示后端（零依赖，Node >= 18）
   ------------------------------------------------------------
   实现 qoder-ui Transport 协议 v1，用于验证前端与真实后端的端到端联通。

   启动： node examples/backend-demo.mjs
   端口： PORT=8787（默认 8787）

   端点：
     POST /api/chat      → text/event-stream（chat.delta / chat.done 信封）
     POST /api/terminal  → JSON（stdout / stderr / exitCode / cwd）
     GET  /api/health    → { ok: true }

   CORS 全开（演示用），生产请在网关收紧。
   ⚠ 终端为白名单沙箱实现（仅演示协议，生产请用真实 shell 会话/容器隔离）。
   ============================================================ */
import http from 'node:http';
import { spawn } from 'node:child_process';
import { mkdirSync, existsSync } from 'node:fs';
import { dirname, join, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const PORT = Number(process.env.PORT || 8787);
const ROOT = dirname(fileURLToPath(import.meta.url));
const SANDBOX = join(ROOT, 'sandbox');
if (!existsSync(SANDBOX)) mkdirSync(SANDBOX, { recursive: true });

/* ---------- 通用响应头 ---------- */
function cors(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
}

function readBody(req) {
  return new Promise((resolveBody) => {
    let data = '';
    req.on('data', (c) => { data += c; if (data.length > 1e6) req.destroy(); });
    req.on('end', () => { try { resolveBody(JSON.parse(data || '{}')); } catch { resolveBody({}); } });
  });
}

/* ---------- GET /api/chat：SSE 流式对话 ---------- */
function handleChat(req, res) {
  cors(res);
  res.writeHead(200, { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache', Connection: 'keep-alive' });
  const send = (env) => res.write(`data: ${JSON.stringify(env)}\n\n`);

  readBody(req).then((body) => {
    const p = body.payload || {};
    const text = String(p.text || '');
    const msgId = String(p.id || body.id || 'chat_x');
    const reply =
      `【演示后端回声】收到 ${text.length} 个字符："${text}"。\n\n` +
      `这是 Node 演示后端经 SSE 流式返回的内容——你的前端 UI 已与真实网络后端打通。\n` +
      `把本文件换成 Rust (axum) / Hono / NestJS 实现，前端一行代码都不用改：\n\n` +
      `    QoderUI.transport.use('rest', { baseUrl: 'http://localhost:8787/api' })\n` +
      `    // 或\n` +
      `    QoderUI.transport.use('ws', { url: 'ws://localhost:8787/ws' })`;

    let i = 0;
    const timer = setInterval(() => {
      const prev = i;
      i = Math.min(reply.length, i + 2 + Math.floor(Math.random() * 4));
      send({ v: 1, id: 'env_' + i, type: 'chat.delta', channel: 'chat', payload: { id: msgId, delta: reply.slice(prev, i) }, ts: Date.now() });
      if (i >= reply.length) {
        clearInterval(timer);
        send({ v: 1, id: 'env_done', type: 'chat.done', channel: 'chat', payload: { id: msgId, finishReason: 'stop' }, ts: Date.now() });
        res.end();
      }
    }, 18);
    req.on('close', () => clearInterval(timer));
  });
}

/* ---------- POST /api/terminal：白名单沙箱命令 ---------- */
const ALLOWED = new Set(['help', 'ls', 'pwd', 'echo', 'date', 'whoami', 'cat', 'node', 'npm', 'git', 'head', 'wc']);

function resolveCwd(cwd) {
  if (!cwd || cwd === '~' || cwd === '/') return SANDBOX;
  const target = resolve(SANDBOX, '.' + (cwd.startsWith('/') ? '' : '') + cwd.replace(/^~/, ''));
  if (target !== SANDBOX && !target.startsWith(SANDBOX + sep)) return null; // 越界防护
  return target;
}

async function handleTerminal(req, res) {
  cors(res);
  const body = await readBody(req);
  const p = body.payload || {};
  const cmd = String(p.cmd || '').trim();
  const cwd = resolveCwd(p.cwd);

  const json = (payload) => { cors(res); res.writeHead(200, { 'Content-Type': 'application/json' }); res.end(JSON.stringify({ v: 1, type: 'terminal.exit', payload })); };

  if (!cwd) return json({ tabId: p.tabId, stderr: `cd: 越界：沙箱限定在 examples/sandbox 内`, exitCode: 1, cwd: p.cwd });
  if (!cmd) return json({ tabId: p.tabId, stderr: '空命令', exitCode: 1, cwd: p.cwd });

  // 处理 cd（后端维护目录状态并回传）
  if (cmd === 'cd' || cmd.startsWith('cd ')) {
    const arg = cmd.slice(2).trim() || '';
    const next = arg === '' || arg === '~' ? null : resolveCwd((p.cwd === '~' ? '' : p.cwd) + '/' + arg.replace(/^\/+/, ''));
    if (next === null) return json({ tabId: p.tabId, stderr: `cd: 越界`, exitCode: 1, cwd: p.cwd });
    if (next !== SANDBOX && !existsSync(next)) return json({ tabId: p.tabId, stderr: `cd: no such directory: ${arg}`, exitCode: 1, cwd: p.cwd });
    return json({ tabId: p.tabId, stdout: '', exitCode: 0, cwd: next === SANDBOX ? '~' : next.slice(SANDBOX.length) || '/' });
  }

  const parts = cmd.split(/\s+/);
  const bin = parts[0];
  if (bin === 'help') {
    return json({ tabId: p.tabId, stdout: '沙箱白名单命令：help ls pwd echo date whoami cat node npm git head wc\n另有 cd <dir>（目录切换）；clear / exit 由前端本地处理。', exitCode: 0, cwd: p.cwd });
  }
  if (!ALLOWED.has(bin)) return json({ tabId: p.tabId, stderr: `command not found（演示沙箱白名单：${[...ALLOWED].join(' ')}）: ${bin}`, exitCode: 127, cwd: p.cwd });
  // 参数越界防护：拒绝 .. 或绝对路径参数
  if (parts.slice(1).some((a) => a.includes('..') || /^\/(?!$)/.test(a))) {
    return json({ tabId: p.tabId, stderr: `blocked: 参数超出沙箱范围（演示限制）`, exitCode: 1, cwd: p.cwd });
  }

  const child = spawn(bin, parts.slice(1), { cwd, shell: false, timeout: 8000, env: { PATH: process.env.PATH, HOME: SANDBOX } });
  let stdout = ''; let stderr = '';
  child.stdout.on('data', (d) => { stdout += d; });
  child.stderr.on('data', (d) => { stderr += d; });
  const code = await new Promise((r) => { child.on('close', r); child.on('error', () => r(1)); });
  json({ tabId: p.tabId, stdout: stdout.slice(0, 64e3), stderr: stderr.slice(0, 16e3), exitCode: code ?? 0, cwd: p.cwd });
}

/* ---------- 服务 ---------- */
const server = http.createServer((req, res) => {
  if (req.method === 'OPTIONS') { cors(res); res.writeHead(204); return res.end(); }
  const url = (req.url || '').split('?')[0];
  if (req.method === 'GET' && url === '/api/health') { cors(res); res.writeHead(200, { 'Content-Type': 'application/json' }); return res.end(JSON.stringify({ ok: true, protocol: 1, name: 'qoder-demo-backend' })); }
  if (req.method === 'POST' && url === '/api/chat') return handleChat(req, res);
  if (req.method === 'POST' && url === '/api/terminal') return handleTerminal(req, res);
  cors(res); res.writeHead(404, { 'Content-Type': 'application/json' }); res.end(JSON.stringify({ error: 'not found', endpoints: ['POST /api/chat', 'POST /api/terminal', 'GET /api/health'] }));
});

server.listen(PORT, () => {
  console.log(`\n  Qoder UI 演示后端已启动`);
  console.log(`  ─────────────────────────────────────────`);
  console.log(`  Chat (SSE)  : POST http://localhost:${PORT}/api/chat`);
  console.log(`  Terminal    : POST http://localhost:${PORT}/api/terminal`);
  console.log(`  Health      : GET  http://localhost:${PORT}/api/health`);
  console.log(`\n  下一步：打开 examples/index.html，右下角「后端连接器」`);
  console.log(`  选择 REST，填 http://localhost:${PORT}/api，点「连接」。`);
  console.log(`  终端沙箱目录：examples/sandbox（可用 ls / cat / node -v 等）\n`);
});
