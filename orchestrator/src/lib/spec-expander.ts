// orchestrator/src/lib/spec-expander.ts

import type { ThinSpec } from './spec-extractor.js';
import type { AppSpec } from '../types/spec.js';
import {
  expandCalculatorExtras,
  expandUnitConverterExtras,
  expandTimerExtras,
  expandWhackAMoleExtras,
  expandMemoryMatchExtras,
  expandNumberQuizExtras,
} from './extras-presets.js';

/**
 * AITuberKit から抽出した ThinSpec を、orchestrator の AppSpec(extras 含む完全形)に変換する。
 * MVP では hints は渡さず、各 expand* 関数のデフォルト値が使われる。
 * Phase 2/3 では ThinSpec を拡張して hints を渡す予定。
 */
export function expandThinSpec(thin: ThinSpec): AppSpec {
  let extras: Record<string, unknown>;

  switch (thin.type) {
    case 'calculator':
      extras = expandCalculatorExtras();
      break;
    case 'unit_converter':
      extras = expandUnitConverterExtras();
      break;
    case 'timer':
      extras = expandTimerExtras();
      break;
    case 'whack_a_mole':
      extras = expandWhackAMoleExtras();
      break;
    case 'memory_match':
      extras = expandMemoryMatchExtras();
      break;
    case 'number_quiz':
      extras = expandNumberQuizExtras();
      break;
  }

  return {
    genre: thin.genre,
    type: thin.type,
    title: thin.title,
    themeColor: thin.themeColor,
    extras,
  };
}
