import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Hono } from 'hono';
import { serve } from '@hono/node-server';
import { logger as honoLogger } from 'hono/logger';
import { cors } from 'hono/cors';
import { env } from './lib/env.js';
import { logger } from './lib/logger.js';
import { jobStore } from './lib/job-store.js';
import { generateRoute } from './routes/generate.js';
import { statusRoute } from './routes/status.js';
import { webhookRoute } from './routes/webhook.js';
import { chatRoute } from './routes/chat.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const QR_HTML_PATH = join(__dirname, '..', 'public', 'qr.html');

const app = new Hono();

// グローバルミドルウェア
app.use('*', honoLogger());
app.use('/api/*', cors({
  origin: env.CORS_ORIGINS.split(',').map((s) => s.trim()),
  credentials: true,
}));

// ヘルスチェック
app.get('/api/health', (c) => {
  return c.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    node: process.version,
    env: env.NODE_ENV,
    publicBaseUrl: env.PUBLIC_BASE_URL,
    githubRepo: env.GITHUB_REPO,
  });
});

// 開発用: 現在のジョブ一覧
app.get('/api/jobs', (c) => {
  return c.json({ jobs: jobStore.list() });
});

// === API ルート ===
app.route('/api/generate', generateRoute);    // Step 2: アプリ生成
app.route('/api/status', statusRoute);        // Step 3: 進捗確認(SSE)
app.route('/api/webhook', webhookRoute);      // Step 4: Actions 完了通知
app.route('/api/chat', chatRoute);            // S6: AITuberKit Custom API Backend

// 既存ルート
app.get('/', (c) => {
  return c.text('Orchestrator is running. Try GET /api/health');
});

// QR 表示画面
app.get('/qr', (c) => {
  const html = readFileSync(QR_HTML_PATH, 'utf-8');
  return c.html(html);
});

// エラーハンドラ
app.onError((err, c) => {
  logger.error({ err }, 'Unhandled error');
  return c.json({ error: err.message }, 500);
});

// 起動
const port = Number(env.PORT);
logger.info({ port, env: env.NODE_ENV }, `🚀 Orchestrator listening on http://localhost:${port}`);

serve({ fetch: app.fetch, port });
