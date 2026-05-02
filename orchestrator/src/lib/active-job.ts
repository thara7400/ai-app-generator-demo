// orchestrator/src/lib/active-job.ts

/**
 * 現在実行中のジョブ ID をシングルトン保持する。
 *
 * MVP 想定: 展示会会場では 1 人ずつ会話 → 同時 1 ジョブが上限。
 * Phase 2 で複数同時対応する場合は Map<sessionId, jobId> に拡張する。
 *
 * 用途:
 * - routes/chat.ts: ジョブ起動時に setActiveJob(jobId) で記録
 * - Step 4(完成通知): getActiveJob() で「どのジョブが完成したか」を AITuberKit に伝える
 */

let currentJobId: string | null = null;

export function setActiveJob(jobId: string): void {
  currentJobId = jobId;
}

export function getActiveJob(): string | null {
  return currentJobId;
}

export function clearActiveJob(): void {
  currentJobId = null;
}
