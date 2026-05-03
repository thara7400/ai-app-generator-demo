import type { AppSpec, AppType } from '../types/spec.js';

/**
 * 各アプリ種別のベースプロンプト
 * プレースホルダ: {TITLE}, {THEME_COLOR}, その他ジャンル固有値
 */
const PROMPTS: Record<AppType, string> = {
  calculator: `Build a 4-function calculator app in Flutter.
- Single StatefulWidget named CalculatorApp
- Display area showing current input/result (right-aligned, large font)
- Button grid 4x5: [C, ±, %, ÷] [7,8,9,×] [4,5,6,−] [1,2,3,+] [0, ., =]
- Material 3 with primarySwatch from {THEME_COLOR}
- Handle division by zero: display "Error"
- Use ElevatedButton for buttons`,

  unit_converter: `Build a {CONVERSION_TYPE} unit converter app in Flutter. This app handles {CONVERSION_TYPE} conversion ONLY — do NOT implement any other conversion types.
- Single StatefulWidget named UnitConverterApp
- Two TextField widgets (source value input, target value result display)
- Two DropdownButton widgets (source unit selection, target unit selection)
- Units available: {UNITS}
- Conversion logic: {FORMULAS}
- Real-time conversion: when source value or either dropdown changes, recompute result
- Show result with 4 decimal places, rounded
- Handle empty input gracefully (show empty result, no error on empty string)
- Material 3 with primarySwatch from {THEME_COLOR}`,
  timer: `Build a stopwatch and countdown timer app in Flutter.

# App Structure (FIXED - implement exactly as specified)
- Single StatefulWidget as root
- DefaultTabController with length: 2
- AppBar with TabBar, two tabs labeled: "Stopwatch" and "Timer"
- TabBarView body with two children: StopwatchTab and TimerTab

# Stopwatch Tab
- Large display showing elapsed time in format "MM:SS.SS"
  (minutes:seconds.hundredths, e.g. "01:23.45")
- Use Stopwatch class from dart:core and Timer.periodic with
  Duration(milliseconds: 10) from dart:async
- Three ElevatedButtons in a row: "Start", "Stop", "Reset"
- Start: begins or resumes; Stop: pauses; Reset: zero out
- Display font size: 64, monospace style (fontFamily: 'monospace')

# Timer Tab (countdown)
- Two DropdownButton<int> side by side, labeled "Minutes" and "Seconds"
  - Minutes: items 0 to 59
  - Seconds: items 0 to 59
- Large display showing remaining time in format "MM:SS"
  (font size 64, monospace)
- Two ElevatedButtons: "Start" and "Reset"
- Start: begin countdown using Timer.periodic with Duration(seconds: 1)
- When countdown reaches 00:00:
  - Stop the timer
  - Show AlertDialog with title "Time's up!" and an "OK" button
  - Do NOT use vibration, sound, or any platform-specific APIs
- Reset: stop countdown and restore to selected minutes/seconds

# Constraints (CRITICAL)
- Implement BOTH tabs in the single lib/main.dart file
- Use ONLY dart:core, dart:async, package:flutter/material.dart
- NO external packages, NO platform channels
- Properly cancel timers in dispose() to avoid memory leaks
- Each tab must maintain its own state independently
- Each Tab's State class MUST mix in AutomaticKeepAliveClientMixin
  and override wantKeepAlive to return true. This ensures that
  state (running stopwatch, selected dropdown values, remaining time,
  countdown progress) is preserved when the user switches between tabs.
- When using AutomaticKeepAliveClientMixin, you MUST call
  super.build(context) as the first line inside the build() method.
`,
  whack_a_mole: `Build a whack-a-mole game in Flutter.

## Game Specification (FIXED — implement EXACTLY this, do NOT generalize)
- Difficulty is FIXED to "{DIFFICULTY}". Do NOT implement any difficulty selector
  or other intervals.
- Mole spawn interval is FIXED to {INTERVAL_SECONDS} seconds
  (= {INTERVAL_MS} milliseconds).
- Mole emoji is FIXED to {EMOJI}.
  Do NOT implement an emoji picker or other emoji.
- Game duration is FIXED to 30 seconds.

## Layout
- Single StatefulWidget named WhackAMoleApp at the top level (the MaterialApp host),
  with a separate HomeScreen StatefulWidget that contains the game UI and state.
- Above the grid: a Row with mainAxisAlignment: MainAxisAlignment.spaceBetween showing
  - "Score: <number>" on the left
  - "Time: <seconds>s" on the right
  Both with fontSize: 20 and padding around them.
- 3x3 grid using GridView.count(
    crossAxisCount: 3,
    mainAxisSpacing: 8,
    crossAxisSpacing: 8,
    padding: const EdgeInsets.all(16),
    shrinkWrap: true,
    physics: const NeverScrollableScrollPhysics(),
  ).
- Each cell:
  - Wrapped in a GestureDetector.
  - Cell background: Colors.grey.shade300, rounded corners (BorderRadius.circular(12)).
  - Displays the mole emoji {EMOJI} at fontSize 48, but ONLY when this cell index
    equals _activeMoleIndex.
  - Use AnimatedOpacity (duration: Duration(milliseconds: 200)) so the mole
    fades in/out instead of popping.

## State Variables (declare exactly these in HomeScreen's State class)
- int _score = 0;
- int _remainingSeconds = 30;
- int? _activeMoleIndex;   // null when no mole is showing; 0-8 when a mole is at that cell.
- Timer? _spawnTimer;      // for spawning moles every {INTERVAL_MS} ms.
- Timer? _gameTimer;       // for counting down _remainingSeconds every 1 second.
- Timer? _hideMoleTimer;   // for hiding the current mole after 1 second.
- final Random _random = Random();
- bool _isGameOver = false;

## Timer Behavior (CRITICAL — follow exactly)
- In initState(), call _startGame().
- _startGame() resets state and starts both periodic timers.
  Specifically write:
  \`\`\`
  void _startGame() {
    _spawnTimer?.cancel();
    _gameTimer?.cancel();
    _hideMoleTimer?.cancel();
    setState(() {
      _score = 0;
      _remainingSeconds = 30;
      _activeMoleIndex = null;
      _isGameOver = false;
    });
    _spawnTimer = Timer.periodic(
      const Duration(milliseconds: {INTERVAL_MS}),
      (_) => _spawnMole(),
    );
    _gameTimer = Timer.periodic(
      const Duration(seconds: 1),
      (_) => _tickGameTimer(),
    );
  }
  \`\`\`
- _spawnMole picks a random cell, then schedules hiding it after 1 second.
  Specifically write:
  \`\`\`
  void _spawnMole() {
    if (_isGameOver) return;
    setState(() {
      _activeMoleIndex = _random.nextInt(9);
    });
    _hideMoleTimer?.cancel();
    _hideMoleTimer = Timer(const Duration(seconds: 1), () {
      if (mounted) {
        setState(() {
          _activeMoleIndex = null;
        });
      }
    });
  }
  \`\`\`
- _tickGameTimer decrements _remainingSeconds; when it reaches 0, call _endGame.
- _endGame sets _isGameOver = true, cancels all three timers, then shows AlertDialog.

## Tap Behavior
- onTap of a cell:
  - If _isGameOver, do nothing.
  - If _activeMoleIndex == cellIndex:
    - Call HapticFeedback.lightImpact() FIRST for immediate feedback.
    - Increment _score by 1.
    - Set _activeMoleIndex = null immediately.
    - Cancel _hideMoleTimer (so the next spawn is unaffected).
  - Otherwise: do nothing (no penalty for missing).

## Game Over Dialog
- AlertDialog with:
  - title: const Text("Time's up!")
  - content: Text('Score: \$_score')
  - actions: a single TextButton "Play Again" that pops the dialog and calls _startGame().
- Use showDialog(context: context, barrierDismissible: false, builder: ...).

## dispose() — MUST cancel all three timers
Specifically write:
\`\`\`
@override
void dispose() {
  _spawnTimer?.cancel();
  _gameTimer?.cancel();
  _hideMoleTimer?.cancel();
  super.dispose();
}
\`\`\`

## Imports
- import 'package:flutter/material.dart';
- import 'package:flutter/services.dart';   // for HapticFeedback
- import 'dart:async';   // for Timer
- import 'dart:math';    // for Random
- Do NOT add any other imports.
`,
  memory_match: `Build a memory card matching game in Flutter.

## Game Specification (FIXED — implement EXACTLY this, do NOT generalize)
- Grid is FIXED to {GRID_ROWS} rows × {GRID_COLS} columns ({TOTAL_CELLS} cells total).
  Do NOT implement any grid size selector or other sizes.
- The game uses exactly {PAIR_COUNT} pairs of emoji cards
  ({TOTAL_CELLS} cards total = {PAIR_COUNT} pairs × 2).
- The emoji pool is FIXED to: {EMOJI_POOL}
  Use ALL emojis in this pool, with each one duplicated to form a pair.
  Do NOT add or remove emojis, do NOT implement an emoji picker.

## Layout
- Single StatefulWidget named MemoryMatchApp at the top level (the MaterialApp host),
  with a separate HomeScreen StatefulWidget that contains the game UI and state.
- AppBar title: {TITLE} (this is also set in COMMON_INSTRUCTIONS).
- Above the grid: a Padding with child Text showing
    "Moves: <number>" with fontSize: 20, centered.
- Grid using GridView.count(
    crossAxisCount: {GRID_COLS},
    mainAxisSpacing: 8,
    crossAxisSpacing: 8,
    padding: const EdgeInsets.all(16),
    shrinkWrap: true,
    physics: const NeverScrollableScrollPhysics(),
  ).
- Each cell uses AnimatedSwitcher (duration: Duration(milliseconds: 200))
  to fade between two states:
    - face-down (back of card): Container with Colors.grey.shade400
      background, BorderRadius.circular(12), centered Text "?" in white
      with fontSize: {EMOJI_CARD_FONT_SIZE}.
    - face-up: Container with either Colors.amber.shade100 (revealed but
      not yet matched) or Colors.green.shade300 (already matched) background,
      BorderRadius.circular(12), centered Text with the emoji and
      fontSize: {EMOJI_CARD_FONT_SIZE}.
  Each AnimatedSwitcher child MUST have a unique ValueKey so the switcher
  can detect the state change (use ValueKey('face-up-\$index') and
  ValueKey('face-down-\$index') respectively).

## State Variables (declare exactly these in HomeScreen's State class)
- late List<String> _cards;          // {TOTAL_CELLS} entries: emoji strings (each emoji appears twice).
- final Set<int> _matchedIndices = <int>{};   // indices that are permanently face-up.
- final List<int> _revealedIndices = <int>[]; // indices currently being revealed (max 2).
- int _moves = 0;
- bool _isProcessing = false;        // true during the 1-second wait between two reveals.
- final Random _random = Random();

## Game Setup
- In initState(), call _startGame().
- _startGame() shuffles the cards and resets state.
  Specifically write:
  \`\`\`
  void _startGame() {
    final pool = {EMOJI_POOL};
    final List<String> deck = [...pool, ...pool];   // duplicate to make pairs
    deck.shuffle(_random);
    setState(() {
      _cards = deck;
      _matchedIndices.clear();
      _revealedIndices.clear();
      _moves = 0;
      _isProcessing = false;
    });
  }
  \`\`\`

## Tap Behavior (CRITICAL — follow exactly)
- onTap of a cell at index \`i\`:
  - If _isProcessing, do nothing (block taps during the wait).
  - If _matchedIndices.contains(i), do nothing.
  - If _revealedIndices.contains(i), do nothing (already revealed in this turn).
  - Otherwise:
    - Add \`i\` to _revealedIndices via setState.
    - If _revealedIndices.length == 2, call _evaluatePair().

- _evaluatePair compares the two revealed cards.
  Specifically write:
  \`\`\`
  void _evaluatePair() {
    setState(() {
      _moves++;
      _isProcessing = true;
    });
    final a = _revealedIndices[0];
    final b = _revealedIndices[1];
    if (_cards[a] == _cards[b]) {
      // Match: trigger haptic feedback FIRST for immediate response,
      // then keep them face-up permanently.
      HapticFeedback.lightImpact();
      Future.delayed(const Duration(milliseconds: 400), () {
        if (!mounted) return;
        setState(() {
          _matchedIndices.add(a);
          _matchedIndices.add(b);
          _revealedIndices.clear();
          _isProcessing = false;
        });
        _checkWin();
      });
    } else {
      // No match: flip them back after 1 second.
      Future.delayed(const Duration(milliseconds: 1000), () {
        if (!mounted) return;
        setState(() {
          _revealedIndices.clear();
          _isProcessing = false;
        });
      });
    }
  }
  \`\`\`

## Win Detection
- _checkWin() shows the win dialog if all cards matched.
  Specifically write:
  \`\`\`
  void _checkWin() {
    if (_matchedIndices.length == {TOTAL_CELLS}) {
      showDialog(
        context: context,
        barrierDismissible: false,
        builder: (context) => AlertDialog(
          title: const Text('You Win!'),
          content: Text('Moves: \$_moves'),
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
  }
  \`\`\`

## Card State Helper
- A card at index i is "face-up" when:
    _revealedIndices.contains(i) || _matchedIndices.contains(i)
- A card is "matched" when _matchedIndices.contains(i) — use this to pick
  Colors.green.shade300 instead of Colors.amber.shade100 for the face-up background.

## Imports
- import 'package:flutter/material.dart';
- import 'package:flutter/services.dart';   // for HapticFeedback
- import 'dart:async';   // for Future.delayed
- import 'dart:math';    // for Random
- Do NOT add any other imports.
`,
  number_quiz: `Build a number guessing game in Flutter.

## Game Specification (FIXED — implement EXACTLY this, do NOT generalize)
- Number range is FIXED to 1 to {MAX_NUMBER} (inclusive on both ends).
  Do NOT implement any range selector or other ranges.
- Attempt limit is {ATTEMPT_LIMIT_DESCRIPTION}.
  {ATTEMPT_LIMIT_BEHAVIOR}

## Layout
- Single StatefulWidget named NumberQuizApp at the top level (the MaterialApp host),
  with a separate HomeScreen StatefulWidget that contains the game UI and state.
- AppBar title: {TITLE} (this is also set in COMMON_INSTRUCTIONS).
- Body is a Padding (EdgeInsets.all(16)) wrapping a Column with the
  following children, in this order:
  1. A "Status" Text widget showing attempt count.
     {ATTEMPT_TEXT_SPEC}
     fontSize: 20, centered.
  2. A "Range" Text widget: "Guess a number between 1 and {MAX_NUMBER}",
     fontSize: 16, centered, with vertical padding 8.
  3. A TextField for numeric input:
     - keyboardType: TextInputType.number
     - inputFormatters: [FilteringTextInputFormatter.digitsOnly]
       (import 'package:flutter/services.dart' for FilteringTextInputFormatter)
     - controller: _guessController (TextEditingController)
     - decoration: InputDecoration(border: OutlineInputBorder(), labelText: 'Your guess')
     - textAlign: TextAlign.center
  4. SizedBox(height: 12).
  5. ElevatedButton labeled "Guess" that calls _onGuessPressed().
     The button MUST be disabled (onPressed: null) when _isGameOver is true.
  6. SizedBox(height: 16).
  7. The latest feedback Text (the result of the most recent guess, e.g.
     "Too high", "Too low", or "Correct!"), fontSize: 18, centered.
     Color-coded: red for too high, blue for too low, green for correct.
     Empty string before the first guess.
  8. SizedBox(height: 16).
  9. An Expanded ListView.builder showing the guess history,
     NEWEST FIRST (most recent guess at the top of the list).

## State Variables (declare exactly these in HomeScreen's State class)
- late int _answer;                          // the secret number, 1..{MAX_NUMBER}.
- final TextEditingController _guessController = TextEditingController();
- final List<_GuessEntry> _history = <_GuessEntry>[]; // newest entries appended here
- String _feedback = '';                     // current feedback message
- Color _feedbackColor = Colors.black;       // current feedback color
- int _attempts = 0;
- bool _isGameOver = false;
- final Random _random = Random();

## Helper Class (declare at the bottom of lib/main.dart, outside other classes)
Specifically write:
\`\`\`
class _GuessEntry {
  final int guess;
  final String hint; // 'Too high', 'Too low', or 'Correct!'
  final Color color;
  _GuessEntry(this.guess, this.hint, this.color);
}
\`\`\`

## Game Setup
- In initState(), call _startGame().
- _startGame() picks a new random answer and resets all state.
  Specifically write:
  \`\`\`
  void _startGame() {
    setState(() {
      _answer = _random.nextInt({MAX_NUMBER}) + 1; // 1..{MAX_NUMBER}
      _guessController.clear();
      _history.clear();
      _feedback = '';
      _feedbackColor = Colors.black;
      _attempts = 0;
      _isGameOver = false;
    });
  }
  \`\`\`

## Guess Behavior (CRITICAL — follow exactly)
- _onGuessPressed parses the input, validates it, updates state, and shows
  win/lose dialogs as needed.
  Specifically write:
  \`\`\`
  void _onGuessPressed() {
    if (_isGameOver) return;
    final raw = _guessController.text.trim();
    if (raw.isEmpty) return;
    final parsed = int.tryParse(raw);
    if (parsed == null || parsed < 1 || parsed > {MAX_NUMBER}) {
      setState(() {
        _feedback = 'Enter a number between 1 and {MAX_NUMBER}';
        _feedbackColor = Colors.orange;
      });
      return;
    }

    setState(() {
      _attempts++;
      String hint;
      Color color;
      if (parsed == _answer) {
        hint = 'Correct!';
        color = Colors.green;
      } else if (parsed > _answer) {
        hint = 'Too high';
        color = Colors.red;
      } else {
        hint = 'Too low';
        color = Colors.blue;
      }
      _feedback = hint;
      _feedbackColor = color;
      _history.add(_GuessEntry(parsed, hint, color));
      _guessController.clear();

      if (parsed == _answer) {
        _isGameOver = true;
      }
    });

    if (_history.last.guess == _answer) {
      HapticFeedback.lightImpact();
      _showWinDialog();
      return;
    }

    {ATTEMPT_LIMIT_CHECK}
  }
  \`\`\`

## Win Dialog
- _showWinDialog() displays an AlertDialog announcing victory.
  Specifically write:
  \`\`\`
  void _showWinDialog() {
    showDialog(
      context: context,
      barrierDismissible: false,
      builder: (context) => AlertDialog(
        title: const Text('Correct!'),
        content: Text('You guessed it in \$_attempts attempts.'),
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
  \`\`\`

{GAME_OVER_DIALOG_SPEC}

## History ListView
- ListView.builder must show entries NEWEST FIRST.
  Specifically write the itemBuilder body:
  \`\`\`
  itemCount: _history.length,
  itemBuilder: (context, index) {
    final entry = _history[_history.length - 1 - index]; // reverse order
    final attemptNumber = _history.length - index;
    return ListTile(
      dense: true,
      leading: Text('#\$attemptNumber',
          style: const TextStyle(fontWeight: FontWeight.bold)),
      title: Text('\${entry.guess}'),
      trailing: Text(entry.hint, style: TextStyle(color: entry.color)),
    );
  },
  \`\`\`

## dispose() — MUST dispose the TextEditingController
Specifically write:
\`\`\`
@override
void dispose() {
  _guessController.dispose();
  super.dispose();
}
\`\`\`

## Imports
- import 'package:flutter/material.dart';
- import 'package:flutter/services.dart';   // for FilteringTextInputFormatter
- import 'dart:math';                        // for Random
- Do NOT add any other imports.
`,
};

/** 全アプリ共通の制約事項 */
const COMMON_INSTRUCTIONS = `

## Critical Constraints
- Modify ONLY the file \`lib/main.dart\`
- Do NOT create other files or modify pubspec.yaml
- Use ONLY \`package:flutter/material.dart\` (you may use built-in dart:async, dart:math, and \`package:flutter/services.dart\` for HapticFeedback)
- NO external packages
- Must compile with Flutter 3.38+ and null safety
- Use \`MaterialApp\` with theme set to enable Material 3. Specifically write: \`theme: ThemeData(useMaterial3: true)\`. Do NOT pass useMaterial3 directly to MaterialApp; useMaterial3 is a property of ThemeData, not MaterialApp.
- Title on AppBar: {TITLE}
- AppBar must have backgroundColor: {THEME_COLOR} and foregroundColor: Colors.white (for consistent colored header across all generated apps)
`;

/** themeColor → Dart コード上の色指定 */
const COLOR_MAP: Record<string, string> = {
  blue: 'Colors.blue',
  red: 'Colors.red',
  green: 'Colors.green',
  purple: 'Colors.purple',
  pink: 'Colors.pink',
};

/**
 * unit_converter 用: conversion_type に応じて Units と Formulas を事前展開する
 * プロンプト内で Claude に条件分岐させるのではなく、TypeScript 側で必要な情報のみを埋め込む。
 */
function expandUnitConverter(conversionType: string): {
  units: string;
  formulas: string;
} {
  switch (conversionType) {
    case 'length':
      return {
        units: '["m", "cm", "km", "inch", "feet"]',
        formulas:
          '1 m = 100 cm, 1 m = 0.001 km, 1 m = 39.3701 inch, 1 m = 3.28084 feet. ' +
          'Convert all source units to meters internally, then to target units.',
      };
    case 'weight':
      return {
        units: '["g", "kg", "lb", "oz"]',
        formulas:
          '1 kg = 1000 g, 1 kg = 2.20462 lb, 1 kg = 35.274 oz. ' +
          'Convert all source units to kilograms internally, then to target units.',
      };
    case 'temperature':
      return {
        units: '["°C", "°F", "K"] (these are the labels for Celsius, Fahrenheit, Kelvin respectively)',
        formulas:
          '°C to °F: F = C * 9/5 + 32. °C to K: K = C + 273.15. ' +
          '°F to °C: C = (F - 32) * 5/9. K to °C: C = K - 273.15. ' +
          'For other pairs, convert via °C as intermediate.',
      };
    default:
      return {
        units: '["m", "cm", "km"]',
        formulas: '1 m = 100 cm = 0.001 km.',
      };
  }
}

/**
 * プロンプトインジェクション対策:
 * 制御文字、バッククォート、クォートを除去し、30文字に切り詰める
 */
function sanitize(input: string): string {
  return input
    // eslint-disable-next-line no-control-regex
    .replace(/[\x00-\x1F\x7F]/g, '')
    .replace(/[`"']/g, '')
    .slice(0, 30);
}

/**
 * AppSpec からプロンプト文字列を組み立てる
 */
export function buildPrompt(spec: AppSpec): string {
  const template = PROMPTS[spec.type];
  if (!template || template.startsWith('TODO:')) {
    throw new Error(`Prompt not implemented for app type: ${spec.type}`);
  }

  let prompt = template + COMMON_INSTRUCTIONS;

  // 共通プレースホルダ置換
  prompt = prompt.replace(/{TITLE}/g, sanitize(spec.title));
  prompt = prompt.replace(
    /{THEME_COLOR}/g,
    COLOR_MAP[spec.themeColor] ?? 'Colors.blue'
  );

  // unit_converter 専用: conversion_type を事前展開して {UNITS} {FORMULAS} を埋める
  if (spec.type === 'unit_converter') {
    const conversionType = String(spec.extras.conversion_type ?? 'length');
    const { units, formulas } = expandUnitConverter(conversionType);
    prompt = prompt.replace(/{UNITS}/g, units);
    prompt = prompt.replace(/{FORMULAS}/g, formulas);
  }

  // number_quiz 専用: 長文テンプレート文字列を sanitize ループより前に直接展開する
  // (sanitize は 30 文字打ち切り + バッククォート除去のため Dart コード片が壊れる)
  if (spec.type === 'number_quiz') {
    const rawStringKeys = [
      'attempt_limit_description',
      'attempt_limit_behavior',
      'attempt_text_spec',
      'attempt_limit_check',
      'game_over_dialog_spec',
    ] as const;
    for (const key of rawStringKeys) {
      const value = spec.extras[key];
      if (value !== undefined) {
        const placeholder = `{${key.toUpperCase()}}`;
        prompt = prompt.replace(new RegExp(placeholder, 'g'), String(value));
      }
    }
  }

  // extras の各キーを {KEY_UPPER_CASE} プレースホルダとして置換
  for (const [key, value] of Object.entries(spec.extras)) {
    const placeholder = `{${key.toUpperCase()}}`;
    let valueStr: string;

    if (Array.isArray(value)) {
      valueStr = JSON.stringify(value);
    } else if (typeof value === 'number' || typeof value === 'boolean') {
      valueStr = String(value);
    } else {
      valueStr = sanitize(String(value));
    }

    prompt = prompt.replace(new RegExp(placeholder, 'g'), valueStr);
  }

  return prompt;
}
