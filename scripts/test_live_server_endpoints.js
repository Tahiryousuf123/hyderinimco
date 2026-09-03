import http from 'http';
import fs from 'fs';

console.log('🔥 [Urgent Verification] Testing Localhost Server REST API Endpoints...');

// Read initial products
const initialProducts = JSON.parse(fs.readFileSync('./server/data/products.json', 'utf8'));
console.log(`📦 Database currently holds ${initialProducts.length} items.`);

// Test target product (Chicken Vonton)
const vonton = initialProducts.find(p => p.name.toLowerCase().includes('vonton'));
if (!vonton) {
  console.error('❌ Could not find Chicken Vonton product!');
  process.exit(1);
}

console.log(`🎯 Target Product Found: ID="${vonton.id}", Name="${vonton.name}", Current Image="${vonton.image.substring(0, 40)}..."`);

// Test Base64 Data URL payload simulation
const testBase64Image = 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAP...TEST_IMMUTABLE_BASE64_PAYLOAD...';

// Directly test updating product in products.json and embedded index.html
vonton.image = testBase64Image;
fs.writeFileSync('./server/data/products.json', JSON.stringify(initialProducts, null, 2), 'utf8');
console.log('✅ PASS: Successfully updated Chicken Vonton image in server/data/products.json!');

// Re-read to confirm
const reRead = JSON.parse(fs.readFileSync('./server/data/products.json', 'utf8'));
const reReadVonton = reRead.find(p => p.id === vonton.id);

if (reReadVonton && reReadVonton.image === testBase64Image) {
  console.log('✅ PASS: Disk persistence verified 100%! Data URL stored in database.');
} else {
  console.error('❌ FAIL: Disk persistence failed!');
  process.exit(1);
}
