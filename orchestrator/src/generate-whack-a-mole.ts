/**
 * 動作確認スクリプト: whack-a-mole アプリを 3 パターン連続生成する
 * 実行: npm run generate:whack-a-mole
 * 注意: ANTHROPIC_API_KEY が .env に必要、API 残高を消費する(1回 $0.20〜0.40 程度 × 3回)
 */
import 'dotenv/config';
import path from 'node:path';
import fs from 'node:fs/promises';
import { ClaudeCodeService } from './services/claude-code.js';
import type { AppSpec } from './types/spec.js';

interface MolePattern {
  difficulty: string;
  emoji: string;
  title: string;
  themeColor: string;
  interval_seconds: number;
  interval_ms: number;
}

const patterns: MolePattern[] = [
  { difficulty: 'easy',   emoji: '🐹', title: 'Easy Mole',   themeColor: 'green', interval_seconds: 2.0, interval_ms: 2000 },
  { difficulty: 'normal', emoji: '🐰', title: 'Normal Mole', themeColor: 'green', interval_seconds: 1.5, interval_ms: 1500 },
  { difficulty: 'hard',   emoji: '🦝', title: 'Hard Mole',   themeColor: 'green', interval_seconds: 0.8, interval_ms:  800 },
];

const variations: AppSpec[] = patterns.map((p) => ({
  genre: 'game' as const,
  type: 'whack_a_mole' as const,
  title: p.title,
  themeColor: p.themeColor as AppSpec['themeColor'],
  extras: {
    difficulty:       p.difficulty,
    emoji:            p.emoji,
    interval_seconds: p.interval_seconds,
    interval_ms:      p.interval_ms,
  },
}));

const service = new ClaudeCodeService();

interface RunSummary {
  index: number;
  title: string;
  difficulty: string;
  success: boolean;
  projectDir: string;
  durationMs: number;
  cost: number;
  fileSize?: number;
  errorMessage?: string;
}

const summaries: RunSummary[] = [];

console.log('=== Flutter App Generator — Whack-a-Mole (3 patterns) ===\n');

for (let i = 0; i < variations.length; i++) {
  const spec = variations[i]!;
  const difficulty = patterns[i]!.difficulty;

  console.log(`\n--- [${i + 1}/${variations.length}] ${spec.title} (${difficulty}) ---`);

  const result = await service.generateFlutterApp(spec);

  let fileSize: number | undefined;
  if (result.success && result.generatedCode) {
    const mainDartPath = path.join(result.projectDir, 'lib', 'main.dart');
    try {
      const stat = await fs.stat(mainDartPath);
      fileSize = stat.size;
    } catch {
      // 無視
    }
  }

  summaries.push({
    index: i + 1,
    title: spec.title,
    difficulty,
    success: result.success,
    projectDir: result.projectDir,
    durationMs: result.durationMs ?? 0,
    cost: result.cost ?? 0,
    fileSize,
    errorMessage: result.errorMessage,
  });

  console.log(`  Success:     ${result.success}`);
  console.log(`  Project Dir: ${result.projectDir}`);
  console.log(`  Duration:    ${result.durationMs ?? 0} ms`);
  console.log(`  Cost:        $${(result.cost ?? 0).toFixed(4)} USD`);
  if (fileSize !== undefined) console.log(`  File Size:   ${fileSize} bytes`);
  if (result.errorMessage) console.log(`  Error:       ${result.errorMessage}`);
}

console.log('\n\n=== Summary ===');
console.log('Idx | Title              | Difficulty | Success | Duration | Cost     | Size');
console.log('----+--------------------+------------+---------+----------+----------+--------');
for (const s of summaries) {
  const title      = s.title.padEnd(18).slice(0, 18);
  const difficulty = s.difficulty.padEnd(10);
  const success    = s.success ? 'OK     ' : 'FAIL   ';
  const duration   = `${s.durationMs} ms`.padStart(8);
  const cost       = `$${s.cost.toFixed(4)}`.padStart(8);
  const size       = s.fileSize !== undefined ? `${s.fileSize} B` : '-';
  console.log(`${String(s.index).padStart(3)} | ${title} | ${difficulty} | ${success} | ${duration} | ${cost} | ${size}`);
}

const successCount   = summaries.filter((s) => s.success).length;
const totalCost      = summaries.reduce((acc, s) => acc + s.cost, 0);
const totalDuration  = summaries.reduce((acc, s) => acc + s.durationMs, 0);

console.log('\n=== Totals ===');
console.log(`Success rate: ${successCount}/${summaries.length}`);
console.log(`Total cost:   $${totalCost.toFixed(4)} USD`);
console.log(`Total time:   ${totalDuration} ms (${(totalDuration / 1000).toFixed(1)} s)`);
