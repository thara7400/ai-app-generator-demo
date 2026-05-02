import type { AppSpec } from './spec.js';

/**
 * ジョブ状態の遷移:
 * pending → generating → pushing → building → distributing → completed
 *                                                           ↘ failed
 */
export type JobStatus =
  | 'pending'        // ジョブ作成直後
  | 'generating'     // Claude Code SDK で main.dart 生成中
  | 'pushing'        // GitHub に push 中
  | 'building'       // GitHub Actions 実行中(APK ビルド)
  | 'distributing'   // Firebase App Distribution に配布中
  | 'completed'      // 全工程完了
  | 'failed';        // どこかで失敗

export interface Job {
  id: string;
  status: JobStatus;
  spec: AppSpec;
  createdAt: Date;
  updatedAt: Date;

  // 生成段階の結果
  projectId?: string;        // claude-code が払い出したプロジェクト ID
  generatedCodeBytes?: number;
  generationCost?: number;
  generationDurationMs?: number;

  // GitHub push 段階の結果
  commitSha?: string;
  workflowRunId?: number;    // Actions の run_id(webhook 受信時に Job 特定するキー)

  // 配布完了時の結果
  inviteUrl?: string;
  qrCodeDataUrl?: string;

  // エラー時
  error?: string;
}
