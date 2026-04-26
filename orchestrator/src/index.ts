import { Hono } from 'hono';
import { serve } from '@hono/node-server';
import { logger } from 'hono/logger';

const app = new Hono();

// ログミドルウェア
app.use('*', logger());

// ヘルスチェック
app.get('/api/health', (c) => {
  return c.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    node: process.version,
  });
});

// ルート
app.get('/', (c) => {
  return c.text('Orchestrator is running. Try GET /api/health');
});

// 起動
const port = Number(process.env.PORT ?? 8080);
console.log(`🚀 Orchestrator listening on http://localhost:${port}`);

serve({ fetch: app.fetch, port });
