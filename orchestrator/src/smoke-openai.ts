// orchestrator/src/smoke-openai.ts(一時、確認後に削除)
import 'dotenv/config';
import OpenAI from 'openai';

const client = new OpenAI();
const res = await client.chat.completions.create({
  model: 'gpt-5.4-mini',
  messages: [{ role: 'user', content: 'ping' }],
  max_completion_tokens: 50,  // ← max_tokens から変更、値も少し増やす
});
console.log('OK:', res.choices[0]?.message.content);
console.log('Usage:', res.usage);
