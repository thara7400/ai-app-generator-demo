/**
 * 動作確認スクリプト: memory-match アプリを 3 パターン連続生成する
 * 実行: npm run generate:memory-match
 * 注意: ANTHROPIC_API_KEY が .env に必要、API 残高を消費する(1回 $0.20〜0.40 程度 × 3回)
 */
import 'dotenv/config';
import path from 'node:path';
import fs from 'node:fs/promises';
import { ClaudeCodeService } from './services/claude-code.js';
import type { AppSpec } from './types/spec.js';

interface MemoryMatchPattern {
  grid_size: string;
  title: string;
  themeColor: string;
  emoji_pool: string[];
  grid_rows: number;
  grid_cols: number;
  total_cells: number;
  pair_count: number;
  emoji_card_font_size: number;
}

const patterns: MemoryMatchPattern[] = [
  {
    grid_size: '4x4',
    title: 'Fruits Match',
    themeColor: 'red',
    emoji_pool: ['🍎','🍌','🍇','🍓','🍊','🍑','🍒','🍍'],
    grid_rows: 4, grid_cols: 4, total_cells: 16, pair_count: 8,
    emoji_card_font_size: 36,
  },
  {
    grid_size: '4x4',
    title: 'Animals Match',
    themeColor: 'blue',
    emoji_pool: ['🐶','🐱','🐰','🦊','🐻','🐼','🐸','🐯'],
    grid_rows: 4, grid_cols: 4, total_cells: 16, pair_count: 8,
    emoji_card_font_size: 36,
  },
  {
    grid_size: '6x6',
    title: 'Animals Hard',
    themeColor: 'purple',
    emoji_pool: ['🐶','🐱','🐰','🦊','🐻','🐼','🐸','🐯','🐵','🐺','🐮','🐷','🐹','🐭','🐲','🐔','🦄','🐬'],
    grid_rows: 6, grid_cols: 6, total_cells: 36, pair_count: 18,
    emoji_card_font_size: 24,
  },
];

const variations: AppSpec[] = patterns.map((p) => ({
  genre: 'game' as const,
  type: 'memory_match' as const,
  title: p.title,
  themeColor: p.themeColor as AppSpec['themeColor'],
  extras: {
    emoji_pool:           p.emoji_pool,
    pair_count:           p.pair_count,
    total_cells:          p.total_cells,
    grid_rows:            p.grid_rows,
    grid_cols:            p.grid_cols,
    emoji_card_font_size: p.emoji_card_font_size,
  },
}));

const service = new ClaudeCodeService();

interface RunSummary {
  index: number;
  title: string;
  grid_size: string;
  success: boolean;
  projectDir: string;
  durationMs: number;
  cost: number;
  fileSize?: number;
  errorMessage?: string;
}

const summaries: RunSummary[] = [];

console.log('=== Flutter App Generator — Memory Match (3 patterns) ===\n');

for (let i = 0; i < variations.length; i++) {
  const spec = variations[i]!;
  const grid_size = patterns[i]!.grid_size;

  console.log(`\n--- [${i + 1}/${variations.length}] ${spec.title} (${grid_size}) ---`);

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
    grid_size,
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
console.log('Idx | Title              | Grid       | Success | Duration | Cost     | Size');
console.log('----+--------------------+------------+---------+----------+----------+--------');
for (const s of summaries) {
  const title    = s.title.padEnd(18).slice(0, 18);
  const grid     = s.grid_size.padEnd(10);
  const success  = s.success ? 'OK     ' : 'FAIL   ';
  const duration = `${s.durationMs} ms`.padStart(8);
  const cost     = `$${s.cost.toFixed(4)}`.padStart(8);
  const size     = s.fileSize !== undefined ? `${s.fileSize} B` : '-';
  console.log(`${String(s.index).padStart(3)} | ${title} | ${grid} | ${success} | ${duration} | ${cost} | ${size}`);
}

const successCount  = summaries.filter((s) => s.success).length;
const totalCost     = summaries.reduce((acc, s) => acc + s.cost, 0);
const totalDuration = summaries.reduce((acc, s) => acc + s.durationMs, 0);

console.log('\n=== Totals ===');
console.log(`Success rate: ${successCount}/${summaries.length}`);
console.log(`Total cost:   $${totalCost.toFixed(4)} USD`);
console.log(`Total time:   ${totalDuration} ms (${(totalDuration / 1000).toFixed(1)} s)`);
