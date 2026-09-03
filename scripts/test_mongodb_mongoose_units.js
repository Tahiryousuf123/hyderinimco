/**
 * Unit Test: Mongoose Model Queries & Single Source of Truth
 */
import assert from 'assert';
import { Product } from '../server/models/Product.js';
import { Order } from '../server/models/Order.js';
import { Setting } from '../server/models/Setting.js';

console.log('--- Testing Mongoose Schema Validations & Options ---');

// 1. Verify Product schema allows rich attributes (strict: false)
assert(Product.schema.options.strict === false, 'Product schema must have strict: false');
assert(Product.schema.options.timestamps === true, 'Product schema must have timestamps: true');
console.log('✅ PASS: Product schema is strict: false and timestamps: true');

// 2. Verify Order schema
assert(Order.schema.options.strict === false, 'Order schema must have strict: false');
assert(Order.schema.options.timestamps === true, 'Order schema must have timestamps: true');
console.log('✅ PASS: Order schema is strict: false and timestamps: true');

// 3. Verify Setting schema
assert(Setting.schema.options.strict === false, 'Setting schema must have strict: false');
assert(Setting.schema.options.timestamps === true, 'Setting schema must have timestamps: true');
console.log('✅ PASS: Setting schema is strict: false and timestamps: true');

// 4. Test Product model instantiation & ID isolation
const paniPuriDoc = new Product({
  id: 'prod-pani-puri-99',
  name: 'Hyderi Pani Puri',
  price: 250,
  image: 'data:image/jpeg;base64,PANI_PURI_IMG_XYZ',
  category: 'chaat'
});
const donutDoc = new Product({
  id: 'prod-donut-88',
  name: 'Chicken Donut',
  price: 450,
  image: 'data:image/jpeg;base64,DONUT_IMG_ABC',
  category: 'special'
});

assert.strictEqual(paniPuriDoc.id, 'prod-pani-puri-99');
assert.strictEqual(donutDoc.id, 'prod-donut-88');
assert.notStrictEqual(paniPuriDoc.image, donutDoc.image);
console.log('✅ PASS: Pani Puri & Donut documents maintain complete ID and Image isolation');

// 5. Test Order model structure
const testOrder = new Order({
  id: 'ord-12345',
  orderRef: 'HYD-999999',
  customer: { name: 'Customer Test', phone: '03001234567', address: 'Block H' },
  items: [{ id: 'prod-pani-puri-99', name: 'Hyderi Pani Puri', price: 250, quantity: 2 }],
  totalAmount: 500,
  status: 'pending_verification'
});
assert.strictEqual(testOrder.customer.name, 'Customer Test');
assert.strictEqual(testOrder.items.length, 1);
console.log('✅ PASS: Order model validates nested customer and items arrays');

console.log('\n🎉 ALL MONGOOSE UNIT TESTS PASSED SUCCESSFULLY!');
