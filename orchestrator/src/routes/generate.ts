import { Hono } from 'hono';
import { z } from 'zod';
import { jobStore } from '../lib/job-store.js';
import { startGenerationJob } from '../services/job-pipeline.js';
import { env } from '../lib/env.js';

const specSchema = z.object({
  genre: z.enum(['tool', 'game']),
  type: z.enum([
    'calculator', 'unit_converter', 'timer',
    'whack_a_mole', 'memory_match', 'number_quiz',
  ]),
  title: z.string().min(1).max(30),
  themeColor: z.enum(['blue', 'red', 'green', 'purple', 'pink']).default('blue'),
  extras: z.record(z.string(), z.unknown()).default({}),
});

export const generateRoute = new Hono();

generateRoute.post('/', async (c) => {
  let body: unknown;
  try {
    body = await c.req.json();
  } catch {
    return c.json({ error: 'Invalid JSON body' }, 400);
  }

  const result = specSchema.safeParse(body);
  if (!result.success) {
    return c.json({ error: 'Invalid spec', details: result.error.format() }, 400);
  }

  const { jobId } = startGenerationJob(result.data);
  const job = jobStore.get(jobId);

  return c.json({
    jobId,
    status: job?.status ?? 'pending',
    statusUrl: `${env.PUBLIC_BASE_URL}/api/status/${jobId}`,
  });
});
