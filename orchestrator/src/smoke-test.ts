/**
 * Claude Code SDK 疎通確認
 * 用途: API キーが有効か、SDK が正常に動くか最小確認
 * 実行: npm run smoke
 */
import 'dotenv/config';
import { query, type SDKMessage } from '@anthropic-ai/claude-agent-sdk';

async function main() {
  console.log('🔍 Claude Code SDK smoke test starting...');
  console.log(`   Node: ${process.version}`);
  console.log(`   API Key: ${process.env.ANTHROPIC_API_KEY ? '✅ set' : '❌ not set'}`);

  if (!process.env.ANTHROPIC_API_KEY) {
    console.error('❌ ANTHROPIC_API_KEY is not set in .env');
    process.exit(1);
  }

  const prompt = 'Say "hello from Claude Code SDK" and nothing else.';
  console.log(`\n📝 Prompt: ${prompt}\n`);

  const messages: SDKMessage[] = [];
  const startTime = Date.now();

  try {
    for await (const message of query({
      prompt,
      options: {
        maxTurns: 1,
      },
    })) {
      messages.push(message);
      console.log(`[${message.type}]`, JSON.stringify(message, null, 2).slice(0, 500));
    }

    const durationMs = Date.now() - startTime;
    console.log(`\n✅ Success in ${durationMs}ms. Received ${messages.length} messages.`);

    // コスト情報(あれば)
    const result = messages.find((m) => m.type === 'result');
    if (result && 'cost_usd' in result) {
      console.log(`💰 Cost: $${(result as any).cost_usd}`);
    }
  } catch (error) {
    console.error('\n❌ Error:', error);
    process.exit(1);
  }
}

main();
