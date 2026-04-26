/**
 * プロンプトデバッグスクリプト: API を叩かず buildPrompt() の出力だけを見る
 * 実行: npm run debug:prompts
 * コスト: $0(API 呼び出しなし)
 */
import { buildPrompt } from './prompts/library.js';
import type { AppSpec } from './types/spec.js';

const specs: AppSpec[] = [
  {
    genre: 'tool',
    type: 'unit_converter',
    title: '長さ変換',
    themeColor: 'blue',
    extras: { conversion_type: 'length' },
  },
  {
    genre: 'tool',
    type: 'unit_converter',
    title: '重さコンバーター',
    themeColor: 'green',
    extras: { conversion_type: 'weight' },
  },
  {
    genre: 'tool',
    type: 'unit_converter',
    title: '温度チェンジャー',
    themeColor: 'red',
    extras: { conversion_type: 'temperature' },
  },
  // timer: extras 空でもプロンプトが正しく展開されることを確認
  {
    genre: 'tool',
    type: 'timer',
    title: 'シンプルタイマー',
    themeColor: 'blue',
    extras: {},
  },
  // 比較用: 電卓(extras 空でも影響ないことを確認)
  {
    genre: 'tool',
    type: 'calculator',
    title: 'My Calc',
    themeColor: 'purple',
    extras: {},
  },
  // whack_a_mole: 3パターンの extras 置換確認
  {
    genre: 'game',
    type: 'whack_a_mole',
    title: 'Easy Mole',
    themeColor: 'green',
    extras: {
      difficulty:       'easy',
      emoji:            '🐹',
      interval_seconds: 2.0,
      interval_ms:      2000,
    },
  },
  {
    genre: 'game',
    type: 'whack_a_mole',
    title: 'Normal Mole',
    themeColor: 'green',
    extras: {
      difficulty:       'normal',
      emoji:            '🐰',
      interval_seconds: 1.5,
      interval_ms:      1500,
    },
  },
  {
    genre: 'game',
    type: 'whack_a_mole',
    title: 'Hard Mole',
    themeColor: 'green',
    extras: {
      difficulty:       'hard',
      emoji:            '🦝',
      interval_seconds: 0.8,
      interval_ms:      800,
    },
  },
  // number_quiz: 3パターンの extras 置換確認(通常×2 + チャレンジ×1)
  {
    genre: 'game',
    type: 'number_quiz',
    title: 'Number Quiz',
    themeColor: 'green',
    extras: {
      max_number: 100,
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
    },
  },
  {
    genre: 'game',
    type: 'number_quiz',
    title: 'Big Number Quiz',
    themeColor: 'blue',
    extras: {
      max_number: 1000,
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
    },
  },
  {
    genre: 'game',
    type: 'number_quiz',
    title: 'Number Quiz Challenge',
    themeColor: 'red',
    extras: {
      max_number: 100,
      attempt_limit: 10,
      attempt_limit_description: 'LIMITED to 10 attempts',
      attempt_limit_behavior:
        'When the player uses all 10 attempts without guessing correctly, the game ends and shows a "Game Over" dialog.',
      attempt_text_spec:
        'Format: "Attempts: <current> / 10" (e.g. "Attempts: 3 / 10"). Show "Attempts: 0 / 10" before the first guess.',
      attempt_limit_check:
        `if (_attempts >= 10 && !_isGameOver) {
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
    },
  },
  // memory_match: 3パターンの extras 置換確認
  {
    genre: 'game',
    type: 'memory_match',
    title: 'Fruits Match',
    themeColor: 'red',
    extras: {
      emoji_pool:           ['🍎','🍌','🍇','🍓','🍊','🍑','🍒','🍍'],
      pair_count:           8,
      total_cells:          16,
      grid_rows:            4,
      grid_cols:            4,
      emoji_card_font_size: 36,
    },
  },
  {
    genre: 'game',
    type: 'memory_match',
    title: 'Animals Match',
    themeColor: 'blue',
    extras: {
      emoji_pool:           ['🐶','🐱','🐰','🦊','🐻','🐼','🐸','🐯'],
      pair_count:           8,
      total_cells:          16,
      grid_rows:            4,
      grid_cols:            4,
      emoji_card_font_size: 36,
    },
  },
  {
    genre: 'game',
    type: 'memory_match',
    title: 'Animals Hard',
    themeColor: 'purple',
    extras: {
      emoji_pool:           ['🐶','🐱','🐰','🦊','🐻','🐼','🐸','🐯','🐵','🐺','🐮','🐷','🐹','🐭','🐲','🐔','🦄','🐬'],
      pair_count:           18,
      total_cells:          36,
      grid_rows:            6,
      grid_cols:            6,
      emoji_card_font_size: 24,
    },
  },
];

for (const spec of specs) {
  console.log('='.repeat(80));
  console.log(`SPEC: ${spec.type} / ${spec.title} / ${spec.themeColor}`);
  console.log(`      extras: ${JSON.stringify(spec.extras)}`);
  console.log('='.repeat(80));

  try {
    const prompt = buildPrompt(spec);
    console.log(prompt);
  } catch (err) {
    console.log(`ERROR: ${err instanceof Error ? err.message : String(err)}`);
  }

  console.log('\n');
}
