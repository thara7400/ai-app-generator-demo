// orchestrator/src/routes/chat.ts

import { Hono } from 'hono';
import { streamSSE } from 'hono/streaming';
import type { ChatCompletionMessageParam } from 'openai/resources/chat/completions';
import { generateChatCompletion } from '../services/openai.js';
import { extractAppSpec } from '../lib/spec-extractor.js';
import { expandThinSpec } from '../lib/spec-expander.js';
import { startGenerationJob } from '../services/job-pipeline.js';
import { setActiveJob } from '../lib/active-job.js';
import { logger } from '../lib/logger.js';

interface ChatRequestBody {
  messages?: ChatCompletionMessageParam[];
  /** OpenAI 旧仕様: AITuberKit が max_tokens を送る可能性があるので置換する */
  max_tokens?: number;
  /** OpenAI 新仕様: AITuberKit が新しい場合はこちらが来る */
  max_completion_tokens?: number;
  temperature?: number;
  /** AITuberKit から model 指定が来る場合があるが、orchestrator では使わない(常に gpt-5.4-mini) */
  model?: string;
  /** stream は今は対応しない(常に non-streaming) */
  stream?: boolean;
}

export const chatRoute = new Hono();

chatRoute.post('/', async (c) => {
  let body: ChatRequestBody;
  try {
    body = await c.req.json<ChatRequestBody>();
  } catch {
    return c.json({ error: { message: 'Invalid JSON body', type: 'invalid_request_error' } }, 400);
  }

  if (!Array.isArray(body.messages) || body.messages.length === 0) {
    return c.json(
      {
        error: {
          message: 'messages must be a non-empty array',
          type: 'invalid_request_error',
        },
      },
      400
    );
  }

  // max_tokens → max_completion_tokens 置換(AITuberKit が旧仕様で送ってくる場合に対応)
  const maxCompletionTokens = body.max_completion_tokens ?? body.max_tokens;

  let completion;
  try {
    completion = await generateChatCompletion({
      messages: body.messages,
      maxCompletionTokens,
      temperature: body.temperature,
    });
  } catch (err) {
    const errMsg = err instanceof Error ? err.message : String(err);
    logger.error({ err: errMsg }, 'OpenAI API call failed');
    return c.json(
      {
        error: {
          message: `OpenAI API error: ${errMsg}`,
          type: 'api_error',
        },
      },
      502
    );
  }

  // assistant message を取り出す
  const rawContent = completion.choices[0]?.message.content ?? '';

  // [APP_SPEC] タグ抽出 + 発話用テキスト生成
  const { cleanedText, thinSpec } = extractAppSpec(rawContent);

  // thinSpec が取れたらジョブ起動
  if (thinSpec) {
    const fullSpec = expandThinSpec(thinSpec);
    const { jobId } = startGenerationJob(fullSpec);
    setActiveJob(jobId);
    logger.info({ jobId, type: thinSpec.type, title: thinSpec.title }, 'Job started from chat');
  }

  // AITuberKit Custom API 仕様に合わせて OpenAI 互換 SSE で返す
  // - 1 チャンクで cleanedText 全文を送信(疑似ストリーミング)
  // - AITuberKit 内部の customApi.ts が text-delta / delta 形式に正規化してくれる
  return streamSSE(c, async (stream) => {
    // テキスト本体(1 チャンクで全文)
    const textChunk = {
      id: completion.id,
      object: 'chat.completion.chunk',
      created: completion.created,
      model: completion.model,
      choices: [
        {
          index: 0,
          delta: { role: 'assistant', content: cleanedText },
          finish_reason: null,
        },
      ],
    };
    await stream.writeSSE({ data: JSON.stringify(textChunk) });

    // finish マーカー
    const finishChunk = {
      id: completion.id,
      object: 'chat.completion.chunk',
      created: completion.created,
      model: completion.model,
      choices: [
        {
          index: 0,
          delta: {},
          finish_reason: 'stop',
        },
      ],
    };
    await stream.writeSSE({ data: JSON.stringify(finishChunk) });

    // [DONE] マーカー(OpenAI 慣例、AITuberKit 側もこれを認識してスキップする)
    await stream.writeSSE({ data: '[DONE]' });
  });
});
