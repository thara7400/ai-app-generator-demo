// orchestrator/src/services/openai.ts

import OpenAI from 'openai';
import type {
  ChatCompletion,
  ChatCompletionMessageParam,
} from 'openai/resources/chat/completions';
import { systemPrompt } from '../prompts/system.js';

const client = new OpenAI();

const MODEL = 'gpt-5.4-mini';
const DEFAULT_MAX_COMPLETION_TOKENS = 1024;

export interface ChatRequestInput {
  /** AITuberKit から渡される messages(systemPrompt は orchestrator 側で先頭挿入する) */
  messages: ChatCompletionMessageParam[];
  /** 任意。AITuberKit が max_tokens で送る場合は呼び出し側で max_completion_tokens に置換しておく */
  maxCompletionTokens?: number;
  /** 任意。AITuberKit が指定する温度 */
  temperature?: number;
}

/**
 * OpenAI Chat Completions API を呼び出して、ChatCompletion オブジェクトを返す。
 * - systemPrompt は messages の先頭に挿入する(AITuberKit 側で system role が無くても動く)
 * - モデルは gpt-5.4-mini 固定
 * - max_tokens は使えない(gpt-5 系は max_completion_tokens のみサポート)
 */
export async function generateChatCompletion(
  input: ChatRequestInput
): Promise<ChatCompletion> {
  const messages: ChatCompletionMessageParam[] = [
    { role: 'system', content: systemPrompt },
    ...input.messages,
  ];

  return client.chat.completions.create({
    model: MODEL,
    messages,
    max_completion_tokens: input.maxCompletionTokens ?? DEFAULT_MAX_COMPLETION_TOKENS,
    ...(input.temperature !== undefined && { temperature: input.temperature }),
  });
}
