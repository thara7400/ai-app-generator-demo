import { z } from 'zod';
import 'dotenv/config';

const envSchema = z.object({
  // 基本
  PORT: z.string().default('8080'),
  NODE_ENV: z.enum(['development', 'production']).default('development'),

  // Anthropic(S2 で使用済)
  ANTHROPIC_API_KEY: z.string().min(20).startsWith('sk-ant-'),

  // OpenAI(S6 新規。AITuberKit 会話用、gpt-5.4-mini)
  OPENAI_API_KEY: z.string().min(20).startsWith('sk-'),

  // Claude Code 動作ディレクトリ(S2 で使用済)
  WORK_DIR: z.string().default('./.tmp/flutter-projects'),

  // GitHub Actions 連携(S5 新規)
  GITHUB_TOKEN: z.string().min(20).startsWith('ghp_'),
  GITHUB_REPO: z.string().regex(/^[^/]+\/[^/]+$/, 'must be owner/repo format'),

  // Webhook 認証(S5 新規)
  WEBHOOK_SECRET: z.string().min(32, 'use at least 32 chars (openssl rand -hex 32)'),

  // 公開 URL(S5 新規。ngrok/cloudflared 利用時はその URL に差し替え)
  PUBLIC_BASE_URL: z.string().url(),

  // CORS(S5 新規。AITuberKit 連携で使用)
  CORS_ORIGINS: z.string().default('http://localhost:3000'),

  // AITuberKit 完成通知(S6 Step 4 新規)
  AITUBER_BASE_URL: z.string().url().default('http://localhost:3000'),
  AITUBER_CLIENT_ID: z.string().min(1).default('demo-2026'),
});

export const env = envSchema.parse(process.env);

export type Env = z.infer<typeof envSchema>;
