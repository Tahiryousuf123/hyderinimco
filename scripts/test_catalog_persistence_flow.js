import fs from 'fs';
import path from 'path';

console.log('=== TESTING CATALOG PERSISTENCE & OVERRIDE PREVENTION ===');

// 1. Verify products.json.bak exist
const productsBak = path.join(process.cwd(), 'server', 'data', 'products.json.bak');
const ordersBak = path.join(process.cwd(), 'server', 'data', 'orders.json.bak');
const settingsBak = path.join(process.cwd(), 'server', 'data', 'settings.json.bak');

console.log('Backup products.json.bak exists:', fs.existsSync(productsBak));
console.log('Backup orders.json.bak exists:', fs.existsSync(ordersBak));
console.log('Backup settings.json.bak exists:', fs.existsSync(settingsBak));

// 2. Read products.json
const products = JSON.parse(fs.readFileSync(path.join(process.cwd(), 'server', 'data', 'products.json'), 'utf8'));
console.log('Total catalog products:', products.length);

// 3. Verify deal 5 price and items
const deal5 = products.find(p => p.id === 'deal-prem-5');
console.log('Deal 5 item:', deal5.name, 'Price:', deal5.price);

console.log('=== TEST VERIFICATION READY ===');
