// orchestrator/src/lib/extras-presets.ts

/**
 * 各アプリ種別の extras 展開関数を集約。
 * MVP(Phase 1): hints が来なければ S2 検証済デフォルト値を返す。
 * Phase 2/3: AITuberKit から抽出したヒント値を hints として受ける拡張を想定。
 */

export function expandCalculatorExtras(
  _hints?: Record<string, unknown>
): Record<string, unknown> {
  return {};
}

export function expandUnitConverterExtras(
  hints?: { conversion_type?: 'length' | 'weight' | 'temperature' }
): Record<string, unknown> {
  return {
    conversion_type: hints?.conversion_type ?? 'length',
  };
}

export function expandTimerExtras(
  _hints?: Record<string, unknown>
): Record<string, unknown> {
  return {};
}

export function expandWhackAMoleExtras(
  hints?: { difficulty?: 'easy' | 'normal' | 'hard' }
): Record<string, unknown> {
  const difficulty = hints?.difficulty ?? 'normal';
  const presets = {
    easy:   { interval_seconds: 2.0, interval_ms: 2000, emoji: '🐹' },
    normal: { interval_seconds: 1.5, interval_ms: 1500, emoji: '🐰' },
    hard:   { interval_seconds: 0.8, interval_ms:  800, emoji: '🦝' },
  } as const;
  return { difficulty, ...presets[difficulty] };
}

export function expandMemoryMatchExtras(
  hints?: { grid_size?: '4x4' | '6x6' }
): Record<string, unknown> {
  const gridSize = hints?.grid_size ?? '4x4';
  if (gridSize === '6x6') {
    return {
      emoji_pool: ['🐶','🐱','🐰','🦊','🐻','🐼','🐸','🐯','🐵','🐺','🐮','🐷','🐹','🐭','🐲','🐔','🦄','🐬'],
      pair_count: 18,
      total_cells: 36,
      grid_rows: 6,
      grid_cols: 6,
      emoji_card_font_size: 24,
    };
  }
  // 4x4(MVP デフォルト): Animals
  return {
    emoji_pool: ['🐶','🐱','🐰','🦊','🐻','🐼','🐸','🐯'],
    pair_count: 8,
    total_cells: 16,
    grid_rows: 4,
    grid_cols: 4,
    emoji_card_font_size: 36,
  };
}

export function expandNumberQuizExtras(
  hints?: { max_number?: number; attempt_limit?: number | null }
): Record<string, unknown> {
  const max_number = hints?.max_number ?? 100;
  const attempt_limit = hints?.attempt_limit ?? null;

  if (attempt_limit === null) {
    // 通常モード(MVP デフォルト)
    return {
      max_number,
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
  const limit = attempt_limit;
  return {
    max_number,
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
