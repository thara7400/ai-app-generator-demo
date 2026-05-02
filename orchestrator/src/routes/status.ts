import { Hono } from 'hono';
import { streamSSE } from 'hono/streaming';
import { jobStore } from '../lib/job-store.js';
import { getActiveJob } from '../lib/active-job.js';

export const statusRoute = new Hono();

statusRoute.get('/active/stream', (c) => {
  return streamSSE(c, async (stream) => {
    const startTime = Date.now();
    const MAX_DURATION_MS = 1_800_000; // 30 分

    let lastJobId: string | null = null;
    let lastSnapshot: string | null = null;

    // 接続直後: 現在状態を必ず送る
    const initialActiveJobId = getActiveJob();
    if (initialActiveJobId) {
      const initialJob = jobStore.get(initialActiveJobId);
      if (initialJob) {
        await stream.writeSSE({
          event: 'job_changed',
          data: JSON.stringify({ jobId: initialActiveJobId }),
        });
        await stream.writeSSE({
          event: 'status',
          data: JSON.stringify(initialJob),
        });
        lastJobId = initialActiveJobId;
        lastSnapshot = JSON.stringify({
          status: initialJob.status,
          updatedAt: initialJob.updatedAt,
          commitSha: initialJob.commitSha,
          workflowRunId: initialJob.workflowRunId,
          inviteUrl: initialJob.inviteUrl,
          error: initialJob.error,
        });
      } else {
        await stream.writeSSE({ event: 'idle', data: '{}' });
      }
    } else {
      await stream.writeSSE({ event: 'idle', data: '{}' });
    }

    // ループ: 1秒ごとに差分配信
    while (Date.now() - startTime < MAX_DURATION_MS) {
      const activeJobId = getActiveJob();

      if (!activeJobId) {
        if (lastJobId !== null) {
          await stream.writeSSE({ event: 'idle', data: '{}' });
          lastJobId = null;
          lastSnapshot = null;
        }
      } else {
        if (activeJobId !== lastJobId) {
          await stream.writeSSE({
            event: 'job_changed',
            data: JSON.stringify({ jobId: activeJobId }),
          });
          lastJobId = activeJobId;
          lastSnapshot = null;
        }

        const job = jobStore.get(activeJobId);
        if (job) {
          const snapshot = JSON.stringify({
            status: job.status,
            updatedAt: job.updatedAt,
            commitSha: job.commitSha,
            workflowRunId: job.workflowRunId,
            inviteUrl: job.inviteUrl,
            error: job.error,
          });
          if (snapshot !== lastSnapshot) {
            await stream.writeSSE({
              event: 'status',
              data: JSON.stringify(job),
            });
            lastSnapshot = snapshot;
          }
        }
      }

      await stream.sleep(1000);
    }

    // タイムアウト(クライアントは EventSource の自動再接続で繋ぎ直す)
    await stream.writeSSE({
      event: 'timeout',
      data: JSON.stringify({ message: 'Stream timed out, reconnect expected' }),
    });
  });
});

statusRoute.get('/:jobId', (c) => {
  const jobId = c.req.param('jobId');
  const job = jobStore.get(jobId);
  if (!job) {
    return c.json({ error: 'Job not found' }, 404);
  }
  return c.json(job);
});

statusRoute.get('/:jobId/stream', (c) => {
  const jobId = c.req.param('jobId');

  return streamSSE(c, async (stream) => {
    const startTime = Date.now();
    const MAX_DURATION_MS = 600_000; // 10 分

    let lastSnapshot: string | null = null;

    while (Date.now() - startTime < MAX_DURATION_MS) {
      const job = jobStore.get(jobId);

      if (!job) {
        await stream.writeSSE({
          event: 'error',
          data: JSON.stringify({ error: 'Job not found', jobId }),
        });
        return;
      }

      const snapshot = JSON.stringify({
        status: job.status,
        updatedAt: job.updatedAt,
        commitSha: job.commitSha,
        workflowRunId: job.workflowRunId,
        inviteUrl: job.inviteUrl,
        error: job.error,
      });

      if (snapshot !== lastSnapshot) {
        await stream.writeSSE({
          event: 'status',
          data: JSON.stringify(job),
        });
        lastSnapshot = snapshot;
      }

      if (job.status === 'completed' || job.status === 'failed') {
        return;
      }

      await stream.sleep(1000);
    }

    await stream.writeSSE({
      event: 'timeout',
      data: JSON.stringify({ message: 'Stream timed out after 10 minutes', jobId }),
    });
  });
});
