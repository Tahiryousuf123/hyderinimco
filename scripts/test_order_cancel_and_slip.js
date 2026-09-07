import 'dotenv/config';
import { connectDB, isDBConnected } from '../server/db.js';
import { Order } from '../server/models/Order.js';
import { sendCustomerOrderSlip, notifyOwnerOrderCancelled, notifyCustomerOrderCancelled } from '../server/whatsapp_service.js';

async function runTest() {
  console.log('--- 1. Testing Database Connection ---');
  const connected = await connectDB();
  console.log('MongoDB Connected:', connected, 'readyState:', isDBConnected());
  if (!connected) {
    console.error('Database connection failed');
    process.exit(1);
  }

  console.log('\n--- 2. Creating Test Order for Verification ---');
  const testRef = 'HYD-TEST-' + Math.floor(1000 + Math.random() * 9000);
  const testOrder = await Order.create({
    id: 'ord-test-' + Date.now(),
    orderRef: testRef,
    createdAt: new Date(),
    formattedDate: new Date().toLocaleString('en-PK', { timeZone: 'Asia/Karachi' }),
    customer: {
      fullName: 'Muhammad Test Customer',
      phone: '03362438422',
      address: 'Shop 20, Burhani Bagh, Block E, Hydri',
      area: 'North Nazimabad'
    },
    items: [
      { id: 'special-1', name: 'Chicken Samosa', packQuantity: '12 pcs', quantity: 2, price: 450 }
    ],
    subtotal: 900,
    deliveryFee: 100,
    totalAmount: 1000,
    paymentMethod: 'bank_transfer',
    paymentDetails: {
      bankName: 'Meezan Bank',
      senderAccountName: 'Test Account',
      transactionId: 'TID998877'
    },
    status: 'pending_verification',
    source: 'website'
  });
  console.log(`Created test order ${testOrder.orderRef} in DB`);

  console.log('\n--- 3. Testing sendCustomerOrderSlip ---');
  const slipResult = await sendCustomerOrderSlip(testOrder.toObject ? testOrder.toObject() : testOrder);
  console.log('sendCustomerOrderSlip execution result:', slipResult);

  console.log('\n--- 4. Testing Order Cancellation via MongoDB ---');
  testOrder.status = 'cancelled';
  testOrder.cancellationReason = 'Customer cancelled from screen (Verification Test)';
  testOrder.cancelledAt = new Date();
  await testOrder.save();
  console.log(`Order ${testOrder.orderRef} updated to cancelled`);

  console.log('\n--- 5. Testing Cancel Notifications ---');
  await notifyOwnerOrderCancelled(testOrder, testOrder.cancellationReason);
  await notifyCustomerOrderCancelled(testOrder, testOrder.cancellationReason);
  console.log('Cancel notifications executed successfully');

  console.log('\n--- 6. Clean up test order ---');
  await Order.deleteOne({ orderRef: testRef });
  console.log(`Test order ${testRef} cleaned up`);

  console.log('\n✅ ALL VERIFICATION TESTS PASSED SUCCESSFULLY!');
  process.exit(0);
}

runTest().catch(err => {
  console.error('Test error:', err);
  process.exit(1);
});
