/**
 * ClaudeCodeService: Claude Code SDK を使って Flutter アプリを自動生成するサービス
 * テンプレートをコピーし SDK に lib/main.dart を書かせ、検証・リトライを行う
 */
import path from 'node:path';
import fs from 'node:fs/promises';
import { query } from '@anthropic-ai/claude-agent-sdk';
import type { SDKMessage, SDKResultMessage } from '@anthropic-ai/claude-agent-sdk';
import type { AppSpec, GenerateResult } from '../types/spec.js';
import { buildPrompt } from '../prompts/library.js';
import { logger } from '../lib/logger.js';

const TEMPLATE_PATH = path.resolve('./templates/flutter-empty-base');
const TIMEOUT_MS = 180_000;

async function verifyGenerated(projectDir: string): Promise<boolean> {
  const mainDart = path.join(projectDir, 'lib', 'main.dart');
  try {
    const stat = await fs.stat(mainDart);
    if (stat.size < 500) return false;
    const content = await fs.readFile(mainDart, 'utf8');
    return (
      content.includes("import 'package:flutter/material.dart'") &&
      content.includes('void main()') &&
      content.includes('runApp')
    );
  } catch {
    return false;
  }
}

async function runQuery(
  prompt: string,
  projectDir: string
): Promise<{ messages: SDKMessage[]; resultMessage: SDKResultMessage | null }> {
  const messages: SDKMessage[] = [];
  let resultMessage: SDKResultMessage | null = null;

  const abortController = new AbortController();
  const timeoutId = setTimeout(() => abortController.abort(), TIMEOUT_MS);

  try {
    for await (const message of query({
      prompt,
      options: {
        abortController,
        cwd: projectDir,
        allowedTools: ['Read', 'Write', 'Edit', 'Glob', 'Grep'],
        maxTurns: 10,
      },
    })) {
      messages.push(message);
      if (message.type === 'result') {
        resultMessage = message as SDKResultMessage;
      }
    }
  } finally {
    clearTimeout(timeoutId);
  }

  return { messages, resultMessage };
}

export class ClaudeCodeService {
  async generateFlutterApp(spec: AppSpec): Promise<GenerateResult> {
    const projectId = `app_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const workDir = path.resolve(process.env['WORK_DIR'] ?? './.tmp/flutter-projects');
    const projectDir = path.join(workDir, projectId);
    const startTime = Date.now();

    logger.info({ projectId, type: spec.type }, 'Starting generation');

    try {
      // テンプレートコピー
      await fs.mkdir(workDir, { recursive: true });
      await fs.cp(TEMPLATE_PATH, projectDir, { recursive: true });

      const basePrompt = buildPrompt(spec);
      let resultMessage: SDKResultMessage | null = null;

      // 1回目の試行
      const firstRun = await runQuery(basePrompt, projectDir);
      resultMessage = firstRun.resultMessage;

      // 検証
      const valid = await verifyGenerated(projectDir);

      if (!valid) {
        logger.warn({ projectId }, 'First attempt invalid, retrying');

        // プロジェクトディレクトリをリセット
        await fs.rm(projectDir, { recursive: true, force: true });
        await fs.cp(TEMPLATE_PATH, projectDir, { recursive: true });

        const retryPrompt =
          basePrompt +
          '\n\nIMPORTANT: Previous attempt produced invalid code. Please ensure the code compiles and includes all required imports.';

        const retryRun = await runQuery(retryPrompt, projectDir);
        resultMessage = retryRun.resultMessage;

        const validAfterRetry = await verifyGenerated(projectDir);
        if (!validAfterRetry) {
          const durationMs = Date.now() - startTime;
          logger.error({ projectId, durationMs }, 'Generation failed after retry');
          return {
            projectId,
            projectDir,
            success: false,
            errorMessage: 'Generated code failed validation after retry',
            durationMs,
          };
        }
      }

      const mainDart = path.join(projectDir, 'lib', 'main.dart');
      const generatedCode = await fs.readFile(mainDart, 'utf8');
      const cost = (resultMessage as SDKResultMessage & { total_cost_usd?: number })?.total_cost_usd ?? 0;
      const durationMs = Date.now() - startTime;

      logger.info({ projectId, durationMs, cost }, 'Generation completed');

      return {
        projectId,
        projectDir,
        success: true,
        generatedCode,
        cost,
        durationMs,
      };
    } catch (error: unknown) {
      const durationMs = Date.now() - startTime;
      const isAbort =
        error instanceof Error && error.name === 'AbortError';
      const errorMessage = isAbort
        ? 'Timeout after 180s'
        : error instanceof Error
          ? error.message
          : String(error);

      logger.error({ projectId, error }, 'Generation failed');

      return {
        projectId,
        projectDir,
        success: false,
        errorMessage,
        durationMs,
      };
    }
  }
}
