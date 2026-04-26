/**
 * アプリ生成仕様の型定義
 * AITuberKit → Hono → Claude Code SDK に渡される構造
 */

/** ジャンル */
export type AppGenre = 'tool' | 'game';

/** アプリ種別(6種類) */
export type AppType =
  // ツール系
  | 'calculator'      // 電卓
  | 'unit_converter'  // 単位変換
  | 'timer'           // タイマー
  // ゲーム系
  | 'whack_a_mole'    // もぐらたたき
  | 'memory_match'    // 神経衰弱
  | 'number_quiz';    // 数字当てクイズ

/** テーマカラー */
export type ThemeColor = 'blue' | 'red' | 'green' | 'purple' | 'pink';

/** アプリ仕様(Claude Code に渡す最終形) */
export interface AppSpec {
  /** ジャンル */
  genre: AppGenre;
  /** アプリ種別 */
  type: AppType;
  /** アプリ名(AppBar に表示) */
  title: string;
  /** テーマカラー */
  themeColor: ThemeColor;
  /** ジャンル固有の追加パラメータ */
  extras: Record<string, unknown>;
}

/** 生成結果 */
export interface GenerateResult {
  /** プロジェクトID(UUID形式) */
  projectId: string;
  /** 生成先ディレクトリ(絶対パス) */
  projectDir: string;
  /** 成功フラグ */
  success: boolean;
  /** 生成された lib/main.dart の内容(成功時のみ) */
  generatedCode?: string;
  /** エラーメッセージ(失敗時のみ) */
  errorMessage?: string;
  /** 消費コスト(USD) */
  cost?: number;
  /** 所要時間(ミリ秒) */
  durationMs?: number;
}
