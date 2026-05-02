import { logger } from './logger.js';
import type { Job, JobStatus } from '../types/job.js';
import type { AppSpec } from '../types/spec.js';

class JobStore {
  private jobs = new Map<string, Job>();

  /**
   * 新規ジョブを作成して登録
   */
  create(spec: AppSpec): Job {
    const id = `job_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const now = new Date();
    const job: Job = {
      id,
      status: 'pending',
      spec,
      createdAt: now,
      updatedAt: now,
    };
    this.jobs.set(id, job);
    logger.info({ jobId: id, spec: { type: spec.type, title: spec.title } }, 'Job created');
    return job;
  }

  /**
   * ID でジョブを取得
   */
  get(id: string): Job | undefined {
    return this.jobs.get(id);
  }

  /**
   * ジョブの一部フィールドを更新
   */
  update(id: string, patch: Partial<Omit<Job, 'id' | 'createdAt' | 'spec'>>): Job | undefined {
    const job = this.jobs.get(id);
    if (!job) {
      logger.warn({ jobId: id }, 'Tried to update unknown job');
      return undefined;
    }
    Object.assign(job, patch, { updatedAt: new Date() });
    logger.debug({ jobId: id, status: job.status }, 'Job updated');
    return job;
  }

  /**
   * workflowRunId からジョブを逆引き(Webhook 受信時に使う)
   */
  findByWorkflowRunId(runId: number): Job | undefined {
    for (const job of this.jobs.values()) {
      if (job.workflowRunId === runId) return job;
    }
    return undefined;
  }

  /**
   * commitSha からジョブを逆引き(Webhook 受信時のフォールバック用)
   */
  findByCommitSha(commitSha: string): Job | undefined {
    for (const job of this.jobs.values()) {
      if (job.commitSha === commitSha) return job;
    }
    return undefined;
  }

  /**
   * 全ジョブを返す(デバッグ用)
   */
  list(): Job[] {
    return Array.from(this.jobs.values()).sort(
      (a, b) => b.createdAt.getTime() - a.createdAt.getTime(),
    );
  }

  /**
   * 古いジョブを削除(展示会中のメモリリーク対策)
   * @param olderThanMs このミリ秒より古いジョブを削除(デフォルト 1 時間)
   */
  cleanup(olderThanMs: number = 60 * 60 * 1000): number {
    const now = Date.now();
    let removed = 0;
    for (const [id, job] of this.jobs) {
      if (now - job.updatedAt.getTime() > olderThanMs) {
        this.jobs.delete(id);
        removed++;
      }
    }
    return removed;
  }
}

// シングルトン
export const jobStore = new JobStore();

// 30 分ごとに古いジョブをクリーンアップ
setInterval(() => {
  const removed = jobStore.cleanup();
  if (removed > 0) logger.info({ removed }, 'Cleaned up old jobs');
}, 30 * 60 * 1000);
