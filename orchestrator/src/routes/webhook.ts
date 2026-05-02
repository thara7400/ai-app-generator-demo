import { Hono } from 'hono';
import { z } from 'zod';
import type { Context, Next } from 'hono';
import { jobStore } from '../lib/job-store.js';
import { env } from '../lib/env.js';
import { logger } from '../lib/logger.js';
import { notifyAppCompleted, notifyAppFailed } from '../services/aituber-notifier.js';

const webhookSchema = z.object({
  runId: z.number().int().positive(),
  commitSha: z.string().min(1),
  status: z.enum(['success', 'failure']),
  inviteUrl: z.string().url().optional(),
  errorMessage: z.string().optional(),
  message: z.string().optional(),
});

async function verifyWebhookAuth(c: Context, next: Next) {
  const authHeader = c.req.header('Authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    logger.warn({ path: c.req.path }, 'Webhook called without Bearer token');
    return c.json({ error: 'Unauthorized' }, 401);
  }
  const token = authHeader.slice('Bearer '.length);
  if (token !== env.WEBHOOK_SECRET) {
    logger.warn({ path: c.req.path }, 'Webhook called with invalid token');
    return c.json({ error: 'Forbidden' }, 403);
  }
  await next();
}

export const webhookRoute = new Hono();

webhookRoute.post('/build-complete', verifyWebhookAuth, async (c) => {
  let body: unknown;
  try {
    body = await c.req.json();
  } catch {
    return c.json({ error: 'Invalid JSON body' }, 400);
  }

  const result = webhookSchema.safeParse(body);
  if (!result.success) {
    logger.warn({ details: result.error.format() }, 'Webhook payload validation failed');
    return c.json({ error: 'Invalid payload', details: result.error.format() }, 400);
  }

  const payload = result.data;
  logger.info(
    { runId: payload.runId, commitSha: payload.commitSha, status: payload.status },
    'Webhook received',
  );

  let job = jobStore.findByWorkflowRunId(payload.runId);
  if (!job) {
    job = jobStore.findByCommitSha(payload.commitSha);
    if (job) {
      logger.info(
        { jobId: job.id, runId: payload.runId, commitSha: payload.commitSha },
        'Job found by commitSha fallback',
      );
    }
  }

  if (!job) {
    logger.warn(
      { runId: payload.runId, commitSha: payload.commitSha },
      'No matching job found for webhook',
    );
    return c.json(
      { error: 'Job not found', runId: payload.runId, commitSha: payload.commitSha },
      404,
    );
  }

  const jobId = job.id;

  if (payload.status === 'success') {
    jobStore.update(jobId, {
      status: 'completed',
      inviteUrl: payload.inviteUrl,
    });
    logger.info({ jobId, inviteUrl: payload.inviteUrl }, 'Job completed via webhook');
    // AITuberKit に完成通知を送る(fire-and-forget、失敗してもジョブは completed のまま)
    void notifyAppCompleted(jobId);
  } else {
    const errorMessage = payload.errorMessage ?? 'Build failed';
    jobStore.update(jobId, {
      status: 'failed',
      error: errorMessage,
    });
    logger.warn({ jobId, error: errorMessage }, 'Job failed via webhook');
    // AITuberKit に失敗通知を送る(fire-and-forget、失敗してもジョブは failed のまま)
    void notifyAppFailed(jobId);
  }

  return c.json({
    ok: true,
    jobId,
    newStatus: payload.status === 'success' ? 'completed' : 'failed',
  });
});
