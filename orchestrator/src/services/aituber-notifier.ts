import { env } from '../lib/env.js';
import { jobStore } from '../lib/job-store.js';
import { logger } from '../lib/logger.js';

/**
 * AITuberKit Message Receiver API に「完成通知」を送る。
 * - direct_send 方式(VOICEVOX で発話のみ、AI 経由なし)
 * - 失敗してもジョブ状態は変更しない(冗長性: QR は別画面で表示予定)
 */
export async function notifyAppCompleted(jobId: string): Promise<void> {
  const job = jobStore.get(jobId);
  if (!job) {
    logger.warn({ jobId }, 'aituberNotify: job not found, skip');
    return;
  }

  const title = job.spec.title;
  const message = `『${title}』ができました!画面のQRコードを読み取ってくださいね`;

  const url = `${env.AITUBER_BASE_URL}/api/messages/?clientId=${encodeURIComponent(env.AITUBER_CLIENT_ID)}&type=direct_send`;

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messages: [message] }),
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) {
      const text = await res.text();
      logger.warn(
        { jobId, status: res.status, body: text.slice(0, 200) },
        'aituberNotify: non-2xx response (ignored)',
      );
      return;
    }
    logger.info({ jobId, title }, 'aituberNotify: sent');
  } catch (err) {
    const errMsg = err instanceof Error ? err.message : String(err);
    logger.warn({ jobId, err: errMsg }, 'aituberNotify: exception (ignored)');
  }
}

/**
 * AITuberKit Message Receiver API に「失敗通知」を送る。
 * - direct_send 方式(VOICEVOX で発話のみ、AI 経由なし)
 * - 失敗してもジョブ状態は変更しない(fire-and-forget)
 */
export async function notifyAppFailed(jobId: string): Promise<void> {
  const job = jobStore.get(jobId);
  if (!job) {
    logger.warn({ jobId }, 'aituberNotifyFailed: job not found, skip');
    return;
  }

  const message = 'うーん、ちょっと失敗しちゃいました。もう一回お願いできますか?';

  const url = `${env.AITUBER_BASE_URL}/api/messages/?clientId=${encodeURIComponent(env.AITUBER_CLIENT_ID)}&type=direct_send`;

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messages: [message] }),
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) {
      const text = await res.text();
      logger.warn(
        { jobId, status: res.status, body: text.slice(0, 200) },
        'aituberNotifyFailed: non-2xx response (ignored)',
      );
      return;
    }
    logger.info({ jobId }, 'aituberNotifyFailed: sent');
  } catch (err) {
    const errMsg = err instanceof Error ? err.message : String(err);
    logger.warn({ jobId, err: errMsg }, 'aituberNotifyFailed: exception (ignored)');
  }
}
