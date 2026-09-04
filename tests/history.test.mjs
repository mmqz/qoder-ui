/**
 * v3.4 聊天历史持久化测试
 * Node 环境注入 mock localStorage，验证记录/上限/截断/清空/容错/开关
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));

// mock localStorage（features 按 typeof localStorage !== 'undefined' 探测）
const store = {};
globalThis.localStorage = {
  getItem: (k) => (k in store ? store[k] : null),
  setItem: (k, v) => { store[k] = String(v); },
  removeItem: (k) => { delete store[k]; }
};

await import(path.join(here, '..', 'src', 'qoder-core.js'));
await import(path.join(here, '..', 'src', 'qoder-shadow.js'));
await import(path.join(here, '..', 'src', 'qoder-ui.js'));
await import(path.join(here, '..', 'src', 'qoder-interactions.js'));
await import(path.join(here, '..', 'src', 'qoder-wc.js'));
await import(path.join(here, '..', 'src', 'qoder-features.js'));
await import(path.join(here, '..', 'src', 'qoder-markdown.js'));
await import(path.join(here, '..', 'src', 'qoder-diff.js'));
await import(path.join(here, '..', 'src', 'qoder-transport.js'));

const chat = globalThis.QoderUI.chat;

test('历史记录：写入并读回一致', () => {
  chat.clearHistory();
  chat._recordMsg('user', '你好');
  chat._recordMsg('ai', '**收到**');
  const hist = chat.loadHistory();
  assert.equal(hist.length, 2);
  assert.deepEqual(
    hist.map((m) => [m.role, m.content]),
    [['user', '你好'], ['ai', '**收到**']]
  );
});

test('历史容量：超过 200 条裁剪最旧', () => {
  chat.clearHistory();
  for (let i = 0; i < 210; i++) chat._recordMsg('user', 'm' + i);
  const hist = chat.loadHistory();
  assert.equal(hist.length, 200);
  assert.equal(hist[0].content, 'm10'); // 最旧 10 条被裁
  assert.equal(hist[199].content, 'm209');
});

test('单条截断：8000 字符上限', () => {
  chat.clearHistory();
  chat._recordMsg('ai', 'x'.repeat(9000));
  assert.equal(chat.loadHistory()[0].content.length, 8000);
});

test('空内容不记录、clearHistory 清空', () => {
  chat.clearHistory();
  chat._recordMsg('user', '');
  chat._recordMsg('ai', null);
  assert.equal(chat.loadHistory().length, 0);
  chat._recordMsg('user', 'keep');
  assert.equal(chat.loadHistory().length, 1);
  chat.clearHistory();
  assert.equal(chat.loadHistory().length, 0);
});

test('损坏数据容错：JSON 坏值返回空数组不崩溃', () => {
  chat.clearHistory();
  globalThis.localStorage.setItem('qoder_chat_history', '{broken json');
  assert.deepEqual(chat.loadHistory(), []);
  globalThis.localStorage.setItem('qoder_chat_history', JSON.stringify({ not: 'array' }));
  assert.deepEqual(chat.loadHistory(), []);
  globalThis.localStorage.setItem('qoder_chat_history', JSON.stringify([{ role: 'evil' }, { role: 'user', content: 'ok' }]));
  const hist = chat.loadHistory();
  assert.equal(hist.length, 1);
  assert.equal(hist[0].content, 'ok');
});
