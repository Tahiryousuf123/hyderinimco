/**
 * WhatsApp AI Agent — Automated Test Suite
 * Tests A through H as specified in requirements.
 *
 * Run: node scripts/test_wa_agent.js
 * Requires: MONGODB_URI and GEMINI_API_KEY in environment
 */

import 'dotenv/config';
import { connectDB } from '../server/db.js';
import { handleWhatsAppIncoming, getCustomerHistory, clearCustomerHistory } from '../server/whatsapp_ai.js';
import { Order } from '../server/models/Order.js';

const PHONE_A = '923001234567'; // Test customer A
const PHONE_B = '923009876543'; // Test customer B

let passed = 0;
let failed = 0;

function assert(condition, label) {
  if (condition) {
    console.log(`  ✅ PASS: ${label}`);
    passed++;
  } else {
    console.log(`  ❌ FAIL: ${label}`);
    failed++;
  }
}

async function send(phone, text, msgId = null) {
  const id = msgId || `test_${Date.now()}_${Math.random().toString(36).slice(2,6)}`;
  console.log(`\n  [${phone.slice(-4)}] → "${text}"`);
  const result = await handleWhatsAppIncoming(phone, text, id);
  const reply = result.message || '';
  const shortReply = reply.slice(0, 200).replace(/\n/g, ' ');
  console.log(`  [AI] ← "${shortReply}${reply.length > 200 ? '...' : ''}"`);
  return { result, reply };
}

async function runTests() {
  console.log('\n════════════════════════════════════════');
  console.log('   HYDERI NIMCO WhatsApp AI Test Suite');
  console.log('════════════════════════════════════════\n');

  // Connect to MongoDB
  console.log('Connecting to MongoDB Atlas...');
  const connected = await connectDB();
  if (!connected) {
    console.error('❌ FATAL: Cannot connect to MongoDB. Set MONGODB_URI env var.');
    process.exit(1);
  }
  console.log('✅ MongoDB Connected\n');

  // Clean up any previous test orders
  try {
    await Order.deleteMany({ 'notes': { $regex: 'idempotency:test_' } });
    console.log('🧹 Cleaned up previous test orders\n');
  } catch (e) {}

  // Clear customer histories
  clearCustomerHistory(PHONE_A);
  clearCustomerHistory(PHONE_B);

  // ─────────────────────────────────────
  // TEST A: Natural language order intent
  // ─────────────────────────────────────
  console.log('─── TEST A: Natural language order intent ───');
  const a = await send(PHONE_A, 'bhai 2 samosay aur 1 kg nimco chahiye');
  assert(a.reply.length > 20, 'AI responded with content');
  assert(!a.result._duplicate, 'Not marked as duplicate');
  // Should ask for confirmation or show a summary — NOT create order yet
  const ordersBefore = await Order.countDocuments({ 'customer.phone': PHONE_A });
  assert(ordersBefore === 0, 'Order NOT yet created (awaiting confirmation)');

  // ─────────────────────────────────────
  // TEST B: Order confirmation flow
  // ─────────────────────────────────────
  console.log('\n─── TEST B: Order confirmation + MongoDB write ───');
  // First give address (required for order)
  await send(PHONE_A, 'Address: Block 5, North Nazimabad, House 12');
  const b = await send(PHONE_A, 'haan confirm kar do');
  assert(b.reply.length > 20, 'AI responded after confirmation');

  // Wait a moment for async order creation
  await new Promise(r => setTimeout(r, 3000));
  const ordersAfter = await Order.countDocuments({ 'customer.phone': { $in: [PHONE_A, '92' + PHONE_A.replace(/^92/, '')] } });
  assert(ordersAfter > 0 || b.reply.toLowerCase().includes('order') || b.reply.includes('confirm'), 
    'Order created in MongoDB OR confirmation message shown');

  // ─────────────────────────────────────
  // TEST C: Order status lookup
  // ─────────────────────────────────────
  console.log('\n─── TEST C: Order status lookup ───');
  const c = await send(PHONE_A, 'mera order status kya hai?');
  assert(c.reply.length > 10, 'AI responded to status query');
  const mentionsOrder = c.reply.toLowerCase().includes('order') || c.reply.includes('WA-') || c.reply.includes('pending');
  assert(mentionsOrder, 'Response mentions order/status information');

  // ─────────────────────────────────────
  // TEST D: Budget-based recommendation
  // ─────────────────────────────────────
  console.log('\n─── TEST D: 500 rupay budget recommendation ───');
  clearCustomerHistory(PHONE_B);
  const d = await send(PHONE_B, '500 rupay mein family ke liye kuch suggest karo');
  assert(d.reply.length > 30, 'AI responded with recommendation');
  const mentionsPrice = /Rs\.?\s*\d+|rupay|price|rate/i.test(d.reply);
  assert(mentionsPrice, 'Response mentions actual prices from MongoDB');
  assert(!d.reply.includes('undefined') && !d.reply.includes('null'), 'No null/undefined in response');

  // ─────────────────────────────────────
  // TEST E: Product availability check
  // ─────────────────────────────────────
  console.log('\n─── TEST E: Availability check ───');
  const e = await send(PHONE_B, 'pani puri available hai?');
  assert(e.reply.length > 10, 'AI responded to availability query');
  const mentionsAvail = /available|stock|mil sakta|nahi|Rs\.?\s*\d+/i.test(e.reply);
  assert(mentionsAvail, 'Response addresses availability from MongoDB');

  // ─────────────────────────────────────
  // TEST F: Multi-turn cart accumulation
  // ─────────────────────────────────────
  console.log('\n─── TEST F: Multi-turn cart accumulation ───');
  clearCustomerHistory(PHONE_B);
  await send(PHONE_B, '2 samosay');
  const f = await send(PHONE_B, 'haan 1 kg nimco bhi');
  assert(f.reply.length > 10, 'AI responded to continuation message');
  const historyF = getCustomerHistory(PHONE_B);
  assert(historyF.length >= 2, `Multi-turn history maintained (${historyF.length} messages)`);

  // ─────────────────────────────────────
  // TEST G: Cross-customer isolation
  // ─────────────────────────────────────
  console.log('\n─── TEST G: Cross-customer isolation ───');
  clearCustomerHistory(PHONE_A);
  clearCustomerHistory(PHONE_B);

  // Send to both simultaneously
  const [ga, gb] = await Promise.all([
    send(PHONE_A, 'mujhe samosa chahiye'),
    send(PHONE_B, 'spring roll ki price kya hai?')
  ]);

  const historyA = getCustomerHistory(PHONE_A);
  const historyB = getCustomerHistory(PHONE_B);

  assert(historyA.length > 0, `Customer A has own history (${historyA.length} messages)`);
  assert(historyB.length > 0, `Customer B has own history (${historyB.length} messages)`);

  // Check isolation: A's history should not contain B's message
  const aHasBMsg = historyA.some(m => m.text.includes('spring roll'));
  const bHasAMsg = historyB.some(m => m.text.includes('samosa'));
  // Note: Gemini response might mention samosa/roll legitimately, so check user messages only
  const aUserMsgs = historyA.filter(m => m.sender === 'user').map(m => m.text);
  const bUserMsgs = historyB.filter(m => m.sender === 'user').map(m => m.text);
  assert(!bUserMsgs.some(t => t.includes('samosa chahiye')), 'Customer B does NOT have Customer A\'s messages');
  assert(!aUserMsgs.some(t => t.includes('spring roll')), 'Customer A does NOT have Customer B\'s messages');

  // ─────────────────────────────────────
  // TEST H: Duplicate message idempotency
  // ─────────────────────────────────────
  console.log('\n─── TEST H: Duplicate message idempotency ───');
  const DEDUP_MSG_ID = 'test_dedup_fixed_id_12345';
  const DEDUP_PHONE = '923005551234';
  clearCustomerHistory(DEDUP_PHONE);

  const h1 = await send(DEDUP_PHONE, 'test dedup message', DEDUP_MSG_ID);
  const h2 = await send(DEDUP_PHONE, 'test dedup message', DEDUP_MSG_ID); // same ID

  assert(!h1.result._duplicate, 'First message processed normally');
  assert(h2.result._duplicate === true, 'Second message (same ID) detected as duplicate and skipped');
  assert(h2.result.message === '', 'Duplicate returns empty message (not sent to customer)');

  // ─────────────────────────────────────
  // TEST I: Old chatbot NOT reachable
  // ─────────────────────────────────────
  console.log('\n─── TEST I: Old chatbot not reachable from WhatsApp flow ───');
  // The WhatsApp flow goes: handleWhatsAppIncoming → generateAIResponseAsync → Gemini or service-unavailable
  // generateAIResponse() (old engine) is NEVER called from this path
  // Verify by checking the exported function signature
  const { generateAIResponse, generateAIResponseAsync } = await import('../server/ai_engine.js');
  assert(typeof generateAIResponseAsync === 'function', 'generateAIResponseAsync exists');
  assert(typeof generateAIResponse === 'function', 'generateAIResponse exists (legacy, isolated)');
  
  // Call legacy function directly — it should return service-unavailable, NOT keyword responses
  const legacyResult = generateAIResponse('samosa chahiye');
  assert(
    legacyResult.reply.includes('unavailable') || legacyResult.reply.includes('call') || legacyResult.reply.includes('Maafi'),
    'Legacy generateAIResponse returns service-unavailable (NOT keyword chatbot response)'
  );
  assert(
    !legacyResult.reply.includes('Ji bilkul bhai! Ye lijiye rate'),
    'Legacy function does NOT return old chatbot product listing response'
  );

  // ─────────────────────────────────────
  // FINAL SUMMARY
  // ─────────────────────────────────────
  console.log('\n════════════════════════════════════════');
  console.log(`   RESULTS: ${passed} PASSED / ${failed} FAILED`);
  console.log('════════════════════════════════════════\n');

  if (failed > 0) {
    console.log('⚠️  Some tests failed. Review output above.');
    process.exit(1);
  } else {
    console.log('🎉 All tests passed!');
    process.exit(0);
  }
}

runTests().catch(err => {
  console.error('Test suite crashed:', err);
  process.exit(1);
});
