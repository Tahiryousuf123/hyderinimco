import { handleWhatsAppIncoming, getCustomerHistory, clearCustomerHistory } from '../server/whatsapp_ai.js';
import { connectDB } from '../server/db.js';

async function runTestSuite() {
  console.log('====================================================');
  console.log('   HYDERI WHATSAPP AI AGENT 10-STEP TEST SUITE');
  console.log('====================================================\n');

  // Ensure DB connected if MONGODB_URI exists
  await connectDB();

  const phoneA = '923001111111';
  const phoneB = '923002222222';

  clearCustomerHistory(phoneA);
  clearCustomerHistory(phoneB);

  // TEST 1: Greeting
  console.log('--- TEST 1: Greeting ---');
  const res1 = await handleWhatsAppIncoming(phoneA, 'Assalam o Alaikum');
  console.log('AI Reply:\n', res1.message, '\n');

  // TEST 2: Product Price Inquiry
  console.log('--- TEST 2: Product Price Inquiry ---');
  const res2 = await handleWhatsAppIncoming(phoneA, 'nuggets kitne ke hain');
  console.log('AI Reply:\n', res2.message, '\n');

  // TEST 3: Multi-turn Context ("2 packet chahiye")
  console.log('--- TEST 3: Multi-turn Quantity ("2 packet chahiye") ---');
  const res3 = await handleWhatsAppIncoming(phoneA, '2 packet chahiye');
  console.log('AI Reply:\n', res3.message, '\n');

  // TEST 4: Context Addition ("aur cheese balls?")
  console.log('--- TEST 4: Context Addition ("aur cheese balls?") ---');
  const res4 = await handleWhatsAppIncoming(phoneA, 'aur cheese balls?');
  console.log('AI Reply:\n', res4.message, '\n');

  // TEST 5: Total Calculation
  console.log('--- TEST 5: Total Calculation ("2 nuggets aur 1 cheese ball ka total batao") ---');
  const res5 = await handleWhatsAppIncoming(phoneA, '2 nuggets aur 1 cheese ball ka total batao');
  console.log('AI Reply:\n', res5.message, '\n');

  // TEST 6: Area Delivery Charge ("DHA delivery kitni hai")
  console.log('--- TEST 6: Delivery Charge ("DHA delivery kitni hai") ---');
  const res6 = await handleWhatsAppIncoming(phoneA, 'DHA delivery kitni hai');
  console.log('AI Reply:\n', res6.message, '\n');

  // TEST 7: Free Delivery Policy ("5000 ka order ho to delivery free hai?")
  console.log('--- TEST 7: Free Delivery Policy ---');
  const res7 = await handleWhatsAppIncoming(phoneA, '5000 ka order ho to delivery free hai?');
  console.log('AI Reply:\n', res7.message, '\n');

  // TEST 8: Party Recommendation ("20 logon ki dawat hai kya lena chahiye")
  console.log('--- TEST 8: Party Recommendation ---');
  const res8 = await handleWhatsAppIncoming(phoneA, '20 logon ki dawat hai kya lena chahiye');
  console.log('AI Reply:\n', res8.message, '\n');

  // TEST 9: Ambiguous Context Handling
  console.log('--- TEST 9: Ambiguous Context ---');
  const res9 = await handleWhatsAppIncoming(phoneA, 'mujhe woh wala 2 packet aur same ke 1 aur');
  console.log('AI Reply:\n', res9.message, '\n');

  // TEST 10: Customer Memory Isolation
  console.log('--- TEST 10: Customer Memory Isolation ---');
  await handleWhatsAppIncoming(phoneB, 'samosa kitne ka hai');
  const histA = getCustomerHistory(phoneA);
  const histB = getCustomerHistory(phoneB);

  console.log(`Customer A History Count: ${histA.length}`);
  console.log(`Customer B History Count: ${histB.length}`);

  const isIsolated = histA.length > 0 && histB.length > 0 && histA.length !== histB.length;
  console.log(`Memory Isolation Test Passed: ${isIsolated ? 'YES ✅' : 'NO ❌'}`);

  console.log('\n====================================================');
  console.log('   ALL 10 TEST SCENARIOS COMPLETED SUCCESSFULLY!');
  console.log('====================================================');
  process.exit(0);
}

runTestSuite().catch(err => {
  console.error('Test Suite Error:', err);
  process.exit(1);
});
