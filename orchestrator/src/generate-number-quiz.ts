/**
 * 動作確認スクリプト: number-quiz アプリを 3 パターン連続生成する
 * 実行: npm run generate:number-quiz
 * 注意: ANTHROPIC_API_KEY が .env に必要、API 残高を消費する(1回 $0.07〜0.15 程度 × 3回)
 */
import 'dotenv/config';
import path from 'node:path';
import fs from 'node:fs/promises';
import { ClaudeCodeService } from './services/claude-code.js';
import type { AppSpec } from './types/spec.js';

interface NumberQuizPattern {
  label: string;          // サマリ用ラベル
  title: string;
  themeColor: string;
  max_number: number;
  attempt_limit: number | null; // null = 無制限
}

const patterns: NumberQuizPattern[] = [
  {
    label: 'Simple (1-100)',
    title: 'Number Quiz',
    themeColor: 'green',
    max_number: 100,
    attempt_limit: null,
  },
  {
    label: 'Large (1-1000)',
    title: 'Big Number Quiz',
    themeColor: 'blue',
    max_number: 1000,
    attempt_limit: null,
  },
  {
    label: 'Challenge (10 tries)',
    title: 'Number Quiz Challenge',
    themeColor: 'red',
    max_number: 100,
    attempt_limit: 10,
  },
];

/**
 * パターンに応じてプロンプト埋め込み用の文字列を事前計算する。
 * 通常モードとチャレンジモードで埋め込む文言を切り替えるため、
 * Claude に if 分岐させずに TypeScript 側で展開する(知見 1)。
 */
function expandNumberQuizExtras(p: NumberQuizPattern): Record<string, string | number> {
  if (p.attempt_limit === null) {
    // 通常モード(回数無制限)
    return {
      max_number: p.max_number,
      attempt_limit_description:
        'UNLIMITED — the player can keep guessing until they get the correct answer',
      attempt_limit_behavior:
        'There is NO attempt limit. Do NOT implement any "Game Over" logic; the only end state is winning.',
      attempt_text_spec:
        'Format: "Attempts: <number>" (e.g. "Attempts: 3"). Show 0 before the first guess.',
      attempt_limit_check:
        '// No attempt limit — nothing to do here.',
      game_over_dialog_spec:
        '## Game Over Dialog\n- Not used in this variant. Do NOT implement any game-over dialog or logic.',
    };
  }

  // チャレンジモード(回数制限あり)
  const limit = p.attempt_limit;
  return {
    max_number: p.max_number,
    attempt_limit: limit,
    attempt_limit_description: `LIMITED to ${limit} attempts`,
    attempt_limit_behavior:
      `When the player uses all ${limit} attempts without guessing correctly, the game ends and shows a "Game Over" dialog.`,
    attempt_text_spec:
      `Format: "Attempts: <current> / ${limit}" (e.g. "Attempts: 3 / ${limit}"). Show "Attempts: 0 / ${limit}" before the first guess.`,
    attempt_limit_check:
      `if (_attempts >= ${limit} && !_isGameOver) {
      setState(() {
        _isGameOver = true;
      });
      _showGameOverDialog();
    }`,
    game_over_dialog_spec:
`## Game Over Dialog
- _showGameOverDialog() displays an AlertDialog when the player runs out of attempts.
  Specifically write:
  \`\`\`
  void _showGameOverDialog() {
    final lastGuess = _history.isNotEmpty ? _history.last.guess : 0;
    final diff = (_answer - lastGuess).abs();
    showDialog(
      context: context,
      barrierDismissible: false,
      builder: (context) => AlertDialog(
        title: const Text('Game Over'),
        content: Text('The answer was \$_answer.\\nYour last guess was off by \$diff.'),
        actions: [
          TextButton(
            onPressed: () {
              Navigator.of(context).pop();
              _startGame();
            },
            child: const Text('New Game'),
          ),
        ],
      ),
    );
  }
  \`\`\``,
  };
}

const variations: AppSpec[] = patterns.map((p) => ({
  genre: 'game' as const,
  type: 'number_quiz' as const,
  title: p.title,
  themeColor: p.themeColor as AppSpec['themeColor'],
  extras: expandNumberQuizExtras(p),
}));

const service = new ClaudeCodeService();

interface RunSummary {
  index: number;
  label: string;
  title: string;
  success: boolean;
  projectDir: string;
  durationMs: number;
  cost: number;
  fileSize?: number;
  errorMessage?: string;
}

const summaries: RunSummary[] = [];

console.log('=== Flutter App Generator — Number Quiz (3 patterns) ===\n');

for (let i = 0; i < variations.length; i++) {
  const spec = variations[i]!;
  const label = patterns[i]!.label;

  console.log(`\n--- [${i + 1}/${variations.length}] ${spec.title} (${label}) ---`);

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
    label,
    title: spec.title,
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
console.log('Idx | Label                 | Title                    | Success | Duration | Cost     | Size');
console.log('----+-----------------------+--------------------------+---------+----------+----------+--------');
for (const s of summaries) {
  const label    = s.label.padEnd(21).slice(0, 21);
  const title    = s.title.padEnd(24).slice(0, 24);
  const success  = s.success ? 'OK     ' : 'FAIL   ';
  const duration = `${s.durationMs} ms`.padStart(8);
  const cost     = `$${s.cost.toFixed(4)}`.padStart(8);
  const size     = s.fileSize !== undefined ? `${s.fileSize} B` : '-';
  console.log(`${String(s.index).padStart(3)} | ${label} | ${title} | ${success} | ${duration} | ${cost} | ${size}`);
}

const successCount  = summaries.filter((s) => s.success).length;
const totalCost     = summaries.reduce((acc, s) => acc + s.cost, 0);
const totalDuration = summaries.reduce((acc, s) => acc + s.durationMs, 0);

console.log('\n=== Totals ===');
console.log(`Success rate: ${successCount}/${summaries.length}`);
console.log(`Total cost:   $${totalCost.toFixed(4)} USD`);
console.log(`Total time:   ${totalDuration} ms (${(totalDuration / 1000).toFixed(1)} s)`);
