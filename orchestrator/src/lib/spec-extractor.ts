// orchestrator/src/lib/spec-extractor.ts

import { z } from 'zod';
import { logger } from './logger.js';

/**
 * AITuberKit から抽出する "薄い spec"
 * orchestrator の spec-expander で extras を補完して完全な AppSpec に変換する
 */
export const thinSpecSchema = z.object({
  genre: z.enum(['tool', 'game']),
  type: z.enum([
    'calculator', 'unit_converter', 'timer',
    'whack_a_mole', 'memory_match', 'number_quiz',
  ]),
  title: z.string().min(1).max(30),
  themeColor: z.enum(['blue', 'red', 'green', 'purple', 'pink']),
});

export type ThinSpec = z.infer<typeof thinSpecSchema>;

export interface ExtractResult {
  /** [APP_SPEC] ブロックを削除した発話用テキスト */
  cleanedText: string;
  /** 抽出された薄い spec(タグ無し or パース失敗時は null) */
  thinSpec: ThinSpec | null;
}

const APP_SPEC_PATTERN = /\[APP_SPEC\]([\s\S]*?)\[\/APP_SPEC\]/;

/**
 * AI 応答テキストから [APP_SPEC]...[/APP_SPEC] ブロックを抽出し、
 * 発話用テキスト(タグ削除済み)と薄い spec を返す。
 *
 * - タグが無い場合: thinSpec=null、cleanedText=元のテキスト
 * - タグはあるが JSON パース失敗: thinSpec=null、cleanedText=タグ削除済みテキスト(警告ログ)
 * - タグはあるが Zod 検証失敗: thinSpec=null、cleanedText=タグ削除済みテキスト(警告ログ)
 * - 正常: thinSpec=ThinSpec、cleanedText=タグ削除済みテキスト
 */
export function extractAppSpec(text: string): ExtractResult {
  const match = text.match(APP_SPEC_PATTERN);

  if (!match) {
    return { cleanedText: text, thinSpec: null };
  }

  // タグブロック全体を削除し、前後の余分な空白を整える
  const cleanedText = text.replace(APP_SPEC_PATTERN, '').trim();

  // JSON パース
  let parsed: unknown;
  try {
    parsed = JSON.parse(match[1]?.trim() ?? '');
  } catch (err) {
    logger.warn(
      { err: err instanceof Error ? err.message : String(err), raw: match[1] },
      'Failed to parse [APP_SPEC] JSON'
    );
    return { cleanedText, thinSpec: null };
  }

  // Zod 検証
  const result = thinSpecSchema.safeParse(parsed);
  if (!result.success) {
    logger.warn(
      { errors: result.error.format(), parsed },
      '[APP_SPEC] failed schema validation'
    );
    return { cleanedText, thinSpec: null };
  }

  return { cleanedText, thinSpec: result.data };
}
