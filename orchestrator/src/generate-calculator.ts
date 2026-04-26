/**
 * 動作確認スクリプト: 電卓アプリを 1 回生成してコンソールに結果を出す
 * 実行: npm run generate:calculator
 * 注意: ANTHROPIC_API_KEY が .env に必要、API 残高を消費する($0.05〜0.20 程度)
 */
import 'dotenv/config';
import path from 'node:path';
import fs from 'node:fs/promises';
import { ClaudeCodeService } from './services/claude-code.js';
import type { AppSpec } from './types/spec.js';

const spec: AppSpec = {
  genre: 'tool',
  type: 'calculator',
  title: 'My Calc',
  themeColor: 'blue',
  extras: {},
};

const service = new ClaudeCodeService();

console.log('=== Flutter App Generator — Calculator ===');
console.log(`Starting generation for: ${spec.title} (${spec.type})\n`);

const result = await service.generateFlutterApp(spec);

console.log('=== Result ===');
console.log(`Success:     ${result.success}`);
console.log(`Project ID:  ${result.projectId}`);
console.log(`Project Dir: ${result.projectDir}`);
console.log(`Duration:    ${result.durationMs ?? 0} ms`);
console.log(`Cost:        $${(result.cost ?? 0).toFixed(4)} USD`);

if (result.success && result.generatedCode) {
  const lines = result.generatedCode.split('\n').slice(0, 30);
  console.log('\n=== lib/main.dart (first 30 lines) ===');
  lines.forEach((line, i) => console.log(`${String(i + 1).padStart(3)}: ${line}`));

  const mainDartPath = path.join(result.projectDir, 'lib', 'main.dart');
  const stat = await fs.stat(mainDartPath);
  console.log(`\nFile size: ${stat.size} bytes`);
} else {
  console.log(`\nError: ${result.errorMessage}`);
}
