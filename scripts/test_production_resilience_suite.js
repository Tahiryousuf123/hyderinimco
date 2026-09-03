import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function runProductionResilienceSuite() {
  console.log('============ STARTING PRODUCTION RESILIENCE SUITE ============');

  const API_BASE = 'https://hyderinimco.onrender.com';

  // 1. Fetch initial products
  console.log('\n--- Step 1: Fetching initial products from live backend ---');
  const initialRes = await fetch(`${API_BASE}/api/products`).then(r => r.json());
  console.log(`Source: ${initialRes.source}, Product Count: ${initialRes.products?.length}`);

  const paratha = initialRes.products.find(p => p.name.toLowerCase().includes('lachha') || p.name.toLowerCase().includes('lacha'));
  const puri = initialRes.products.find(p => p.name.toLowerCase().includes('puri'));

  console.log(`Found Lachha Paratha ID: ${paratha?.id}, Image len: ${paratha?.image?.length}`);
  console.log(`Found Plain Puri ID: ${puri?.id}, Image len: ${puri?.image?.length}`);

  if (!paratha || !puri) {
    throw new Error('Could not find target products for testing');
  }

  // 2. Perform test update A: Pani Puri / Plain Puri image update
  console.log('\n--- Step 2: Updating Plain Puri image with new test Base64 payload ---');
  const newPuriImg = 'data:image/jpeg;base64,' + 'A'.repeat(5000) + 'TEST_PURI_IMAGE_DATA_12345';
  const puriUpdateRes = await fetch(`${API_BASE}/api/products/${puri.id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ image: newPuriImg })
  }).then(r => r.json());

  console.log('Puri Update Response:', puriUpdateRes.success, 'Source:', puriUpdateRes.product?.image ? 'OK' : 'FAIL');

  // 3. Perform test update B: Lachha Paratha image update
  console.log('\n--- Step 3: Updating Lachha Paratha image with new test Base64 payload ---');
  const newParathaImg = 'data:image/jpeg;base64,' + 'B'.repeat(5000) + 'TEST_PARATHA_IMAGE_DATA_67890';
  const parathaUpdateRes = await fetch(`${API_BASE}/api/products/${paratha.id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ image: newParathaImg })
  }).then(r => r.json());

  console.log('Paratha Update Response:', parathaUpdateRes.success, 'Source:', parathaUpdateRes.product?.image ? 'OK' : 'FAIL');

  // 4. Confirm both updates in backend
  console.log('\n--- Step 4: Confirming both updates in backend API ---');
  const verifyRes = await fetch(`${API_BASE}/api/products`).then(r => r.json());
  const vParatha = verifyRes.products.find(p => p.id === paratha.id);
  const vPuri = verifyRes.products.find(p => p.id === puri.id);

  console.log(`Verified Paratha Image Contains TEST String: ${vParatha.image.includes('TEST_PARATHA_IMAGE_DATA_67890')}`);
  console.log(`Verified Puri Image Contains TEST String: ${vPuri.image.includes('TEST_PURI_IMAGE_DATA_12345')}`);

  if (!vParatha.image.includes('TEST_PARATHA_IMAGE_DATA_67890') || !vPuri.image.includes('TEST_PURI_IMAGE_DATA_12345')) {
    throw new Error('FAILED: Images were not updated correctly');
  }

  // 5. Test Batch Upsert to ensure authoritative MongoDB sync
  console.log('\n--- Step 5: Triggering Batch Sync to MongoDB Atlas ---');
  const batchRes = await fetch(`${API_BASE}/api/products/batch`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ products: verifyRes.products })
  }).then(r => r.json());

  console.log('Batch Sync Result:', batchRes);

  console.log('\n============ ALL TEST SCENARIOS COMPLETED SUCCESSFULLY ============');
}

runProductionResilienceSuite().catch(err => {
  console.error('Test Suite Failed:', err);
  process.exit(1);
});
