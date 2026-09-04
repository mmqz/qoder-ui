/**
 * Qoder UI 构建脚本
 * 产物（dist/）：
 *   qoder-ui.min.css   — 全部 CSS 打包压缩（含字体资产重写）
 *   qoder-ui.min.js    — IIFE 压缩包（<script> 直接引入，挂 window.QoderUI）
 *   qoder-ui.esm.js    — ESM 压缩包（bundler 用）
 *   qoder-ui.cjs.js    — CJS 压缩包（require 用，浏览器 API 调用时需 DOM）
 *   fonts/             — 图标字体
 * 运行：npm run build
 */
import { build } from 'esbuild';
import { mkdirSync, statSync, readdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const dist = join(root, 'dist');
mkdirSync(dist, { recursive: true });

const banner = `/* Qoder UI v3.3.2 | MIT License | https://github.com/mmqz/qoder-ui */`;

async function run() {
  // 1. CSS 打包 + 压缩（@import 展开，字体资产复制并重写 url）
  await build({
    entryPoints: [join(root, 'src/index.css')],
    outfile: join(dist, 'qoder-ui.min.css'),
    bundle: true,
    minify: true,
    loader: { '.ttf': 'file', '.woff': 'file' },
    assetNames: 'fonts/[name]',
    banner: { css: banner },
    logLevel: 'info',
    metafile: true,
  });

  // 2. JS IIFE（script 标签直接引入，挂 window.QoderUI / globalThis.QoderUI）
  await build({
    entryPoints: [join(root, 'src/esm-entry.js')],
    outfile: join(dist, 'qoder-ui.min.js'),
    bundle: true,
    minify: true,
    format: 'iife',
    globalName: 'QoderUI',
    target: ['es2019'],
    banner: { js: banner },
    logLevel: 'info',
  });

  // 3. ESM
  await build({
    entryPoints: [join(root, 'src/esm-entry.js')],
    outfile: join(dist, 'qoder-ui.esm.js'),
    bundle: true,
    minify: true,
    format: 'esm',
    target: ['es2019'],
    banner: { js: banner },
    logLevel: 'silent',
  });

  // 4. CJS
  await build({
    entryPoints: [join(root, 'src/esm-entry.js')],
    outfile: join(dist, 'qoder-ui.cjs.js'),
    bundle: true,
    minify: true,
    format: 'cjs',
    target: ['es2019'],
    banner: { js: banner },
    logLevel: 'silent',
  });

  // 产物清单
  const files = readdirSync(dist);
  console.log('\n=== dist/ ===');
  files.forEach(f => {
    const kb = (statSync(join(dist, f)).size / 1024).toFixed(1);
    console.log(`  ${f.padEnd(24)} ${kb} KB`);
  });
}

run().catch((e) => { console.error(e); process.exit(1); });
