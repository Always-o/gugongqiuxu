#!/usr/bin/env node
/* ===========================================================
   故宫秋序 · 零依赖本地静态服务
   -----------------------------------------------------------
   只使用 Node.js 标准库，不安装任何 npm 包。
   作用：给纯静态站点提供一个可配置端口的 http 预览环境，
        避免 file:// 协议下浏览器对部分 API 的限制。
   用法：node scripts/serve.mjs   或   npm start
   =========================================================== */

import { createServer } from 'node:http';
import { readFileSync, existsSync } from 'node:fs';
import { readFile, stat } from 'node:fs/promises';
import { resolve, join, sep, extname } from 'node:path';
import { fileURLToPath } from 'node:url';

/** 仓库根目录：本文件位于 <root>/scripts/，故取上一级 */
const ROOT = resolve(fileURLToPath(new URL('..', import.meta.url)));

/** 常见静态资源的 MIME 类型；未知类型按二进制流处理 */
const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.txt': 'text/plain; charset=utf-8',
  '.md': 'text/markdown; charset=utf-8'
};

/* -----------------------------------------------------------
   一、读取 .env（可选）
   不覆盖已在命令行里显式设置的环境变量，方便临时改端口：
     PORT=9000 npm start
   ----------------------------------------------------------- */
function loadEnvFile() {
  const envPath = join(ROOT, '.env');
  if (!existsSync(envPath)) return;

  const text = readFileSync(envPath, 'utf8');
  for (const line of text.split(/\r?\n/)) {
    // 跳过空行与注释行
    if (!line.trim() || line.trim().startsWith('#')) continue;
    const match = line.match(/^\s*([A-Za-z_][A-Za-z0-9_.-]*)\s*=\s*(.*)\s*$/);
    if (!match) continue;

    const key = match[1];
    let value = match[2].trim();
    // 去掉成对的单/双引号
    if ((value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    if (!(key in process.env)) process.env[key] = value;
  }
}

/** 读取正整数配置，非法值回退到默认值 */
function positiveInt(value, fallback) {
  const n = Number.parseInt(value, 10);
  return Number.isInteger(n) && n > 0 && n <= 65535 ? n : fallback;
}

/* -----------------------------------------------------------
   二、组装配置
   ----------------------------------------------------------- */
loadEnvFile();

const PORT = positiveInt(process.env.PORT, 8788);
const HOST = process.env.HOST || '127.0.0.1';
// SITE_ROOT 相对仓库根目录解析，并做目录穿越兜底
const requestedRoot = resolve(ROOT, process.env.SITE_ROOT || '.');
const SITE_ROOT = requestedRoot.startsWith(ROOT + sep) || requestedRoot === ROOT
  ? requestedRoot
  : ROOT;

/* -----------------------------------------------------------
   三、请求处理
   ----------------------------------------------------------- */

/** 统一发送响应，HEAD 请求只回响应头 */
function send(res, status, body, headers = {}) {
  res.writeHead(status, {
    'Cache-Control': 'no-store', // 开发阶段禁用缓存，改完刷新即生效
    'X-Content-Type-Options': 'nosniff',
    ...headers
  });
  res.end(res.req.method === 'HEAD' ? undefined : body);
}

/** 生成简短的错误页，避免浏览器显示空白 */
function errorPage(status, message) {
  return `<!DOCTYPE html><html lang="zh-CN"><meta charset="utf-8">
<title>${status}</title><body style="font:16px/1.8 system-ui;padding:40px;color:#3b2d24">
<h1>${status}</h1><p>${message}</p><p><a href="/">返回首页</a></p></body></html>`;
}

async function handle(req, res) {
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    return send(res, 405, errorPage(405, '仅支持 GET / HEAD 请求'), {
      'Content-Type': 'text/html; charset=utf-8', 'Allow': 'GET, HEAD'
    });
  }

  let pathname;
  try {
    pathname = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
  } catch {
    return send(res, 400, errorPage(400, 'URL 解码失败'), {
      'Content-Type': 'text/html; charset=utf-8'
    });
  }

  // 目录默认指向 index.html
  if (pathname.endsWith('/')) pathname += 'index.html';

  // 关键安全检查：解析后的绝对路径必须仍在站点根目录内
  const filePath = resolve(SITE_ROOT, '.' + pathname);
  if (filePath !== SITE_ROOT && !filePath.startsWith(SITE_ROOT + sep)) {
    return send(res, 403, errorPage(403, '禁止访问站点目录之外的文件'), {
      'Content-Type': 'text/html; charset=utf-8'
    });
  }

  try {
    let target = filePath;
    const info = await stat(target).catch(() => null);
    if (info && info.isDirectory()) target = join(target, 'index.html');
    if (!info) target = filePath; // 交给 readFile 统一抛 404

    const data = await readFile(target);
    const type = MIME[extname(target).toLowerCase()] || 'application/octet-stream';
    return send(res, 200, data, {
      'Content-Type': type,
      'Content-Length': data.length
    });
  } catch (err) {
    const notFound = err && (err.code === 'ENOENT' || err.code === 'EISDIR');
    if (notFound) {
      return send(res, 404, errorPage(404, `未找到 ${pathname}`), {
        'Content-Type': 'text/html; charset=utf-8'
      });
    }
    console.error('[serve] 读取文件失败：', err.message);
    return send(res, 500, errorPage(500, '服务内部错误'), {
      'Content-Type': 'text/html; charset=utf-8'
    });
  }
}

/* -----------------------------------------------------------
   四、启动
   ----------------------------------------------------------- */
const server = createServer((req, res) => {
  // res.req 供 send() 判断是否为 HEAD；同时捕获异步异常防止进程退出
  res.req = req;
  handle(req, res).catch((err) => {
    console.error('[serve] 未捕获异常：', err);
    if (!res.headersSent) {
      send(res, 500, errorPage(500, '服务内部错误'), {
        'Content-Type': 'text/html; charset=utf-8'
      });
    } else {
      res.end();
    }
  });
});

server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`[serve] 端口 ${PORT} 已被占用，可改用：PORT=9000 npm start`);
  } else {
    console.error('[serve] 启动失败：', err.message);
  }
  process.exitCode = 1;
});

server.listen(PORT, HOST, () => {
  console.log('故宫秋序 · 本地预览服务已启动');
  console.log(`  地址：http://${HOST}:${PORT}/`);
  console.log(`  根目录：${SITE_ROOT}`);
  console.log('  按 Ctrl+C 停止');
});
