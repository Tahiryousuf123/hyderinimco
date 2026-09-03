import { generateAIResponseAsync } from '../server/ai_engine.js';

async function testAI() {
  console.log('🧪 Testing AI Engine Responses...');
  
  const testMsg = 'arsalan bhai ki shop hai?';
  const res = await generateAIResponseAsync(testMsg);
  console.log('\n--- Test ("arsalan bhai ki shop hai?") ---');
  console.log(res.reply);
}

testAI().catch(console.error);
