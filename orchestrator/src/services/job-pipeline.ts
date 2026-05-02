import type { AppSpec } from '../types/spec.js';
import { jobStore } from '../lib/job-store.js';
import { ClaudeCodeService } from './claude-code.js';
import { githubService } from './github.js';
import { logger } from '../lib/logger.js';
import { notifyAppFailed } from './aituber-notifier.js';

const claudeCodeService = new ClaudeCodeService();

/**
 * ジョブを作成して、Claude Agent SDK での生成 → GitHub push → Actions トリガー
 * までをバックグラウンドで実行する。
 *
 * 呼び出し側に jobId を返す。生成パイプラインの完了は webhook(routes/webhook.ts)
 * 経由で status: completed/failed に遷移する。
 *
 * 用途:
 * - routes/generate.ts(curl など外部から /api/generate POST 経由)
 * - routes/chat.ts(AITuberKit 経由で [APP_SPEC] を抽出した後)
 */
export function startGenerationJob(spec: AppSpec): { jobId: string } {
  const job = jobStore.create(spec);
  void runGenerationPipeline(job.id);
  return { jobId: job.id };
}

async function runGenerationPipeline(jobId: string): Promise<void> {
  const job = jobStore.get(jobId);
  if (!job) {
    logger.error({ jobId }, 'Job not found in pipeline start');
    return;
  }

  try {
    // Phase 1: Claude Agent SDK で生成
    jobStore.update(jobId, { status: 'generating' });
    const genResult = await claudeCodeService.generateFlutterApp(job.spec);

    if (!genResult.success || !genResult.generatedCode) {
      throw new Error(genResult.errorMessage ?? 'Generation failed');
    }

    jobStore.update(jobId, {
      projectId: genResult.projectId,
      generatedCodeBytes: genResult.generatedCode.length,
      generationCost: genResult.cost,
      generationDurationMs: genResult.durationMs,
    });

    // Phase 2: GitHub に push + Actions 起動
    jobStore.update(jobId, { status: 'pushing' });
    const pushResult = await githubService.pushWithRetry(
      genResult.generatedCode,
      job.spec,
      genResult.projectId,
    );

    jobStore.update(jobId, {
      status: 'building',
      commitSha: pushResult.commitSha,
      workflowRunId: pushResult.workflowRunId,
    });

    logger.info(
      { jobId, commitSha: pushResult.commitSha, workflowRunId: pushResult.workflowRunId },
      'Pipeline reached building state, waiting for webhook',
    );
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : String(err);
    logger.error({ jobId, err: errorMessage }, 'Pipeline failed');
    jobStore.update(jobId, {
      status: 'failed',
      error: errorMessage,
    });
    // AITuberKit に失敗通知を送る(fire-and-forget、失敗してもジョブは failed のまま)
    void notifyAppFailed(jobId);
  }
}
