import fs from 'fs';
import path from 'path';
import { connectDB, isDBConnected } from '../server/db.js';
import { Product } from '../server/models/Product.js';
import { Order } from '../server/models/Order.js';
import { Setting } from '../server/models/Setting.js';

async function runMigration() {
  console.log('=== HYDERI NIMCO MONGODB ATLAS MIGRATION TOOL ===');

  if (!process.env.MONGODB_URI) {
    console.error('ERROR: MONGODB_URI environment variable is not defined.');
    console.error('Please set MONGODB_URI before running migration.');
    process.exit(1);
  }

  const connected = await connectDB();
  if (!connected || !isDBConnected()) {
    console.error('ERROR: Could not connect to MongoDB Atlas database.');
    process.exit(1);
  }

  const dataDir = path.join(process.cwd(), 'server', 'data');

  // 1. Migrate Products
  const productsPath = path.join(dataDir, 'products.json');
  if (fs.existsSync(productsPath)) {
    const products = JSON.parse(fs.readFileSync(productsPath, 'utf8'));
    console.log(`[Products] Migrating ${products.length} products to MongoDB Atlas...`);
    let prodCount = 0;
    for (const prod of products) {
      await Product.updateOne(
        { id: prod.id },
        { $set: prod },
        { upsert: true }
      );
      prodCount++;
    }
    console.log(`[Products] Successfully upserted ${prodCount} products.`);
  }

  // 2. Migrate Orders
  const ordersPath = path.join(dataDir, 'orders.json');
  if (fs.existsSync(ordersPath)) {
    const orders = JSON.parse(fs.readFileSync(ordersPath, 'utf8'));
    console.log(`[Orders] Migrating ${orders.length} orders to MongoDB Atlas...`);
    let orderCount = 0;
    for (const ord of orders) {
      const orderId = ord.id || ('ORD-' + Date.now());
      await Order.updateOne(
        { id: orderId },
        { $set: { ...ord, id: orderId } },
        { upsert: true }
      );
      orderCount++;
    }
    console.log(`[Orders] Successfully upserted ${orderCount} orders.`);
  }

  // 3. Migrate Settings
  const settingsPath = path.join(dataDir, 'settings.json');
  if (fs.existsSync(settingsPath)) {
    const settings = JSON.parse(fs.readFileSync(settingsPath, 'utf8'));
    console.log(`[Settings] Migrating store settings to MongoDB Atlas...`);
    await Setting.updateOne(
      { key: 'store_config' },
      { $set: { key: 'store_config', value: settings } },
      { upsert: true }
    );
    console.log(`[Settings] Successfully upserted store settings.`);
  }

  console.log('=== MIGRATION COMPLETE! ALL DATA SAFE IN MONGODB ATLAS ===');
  process.exit(0);
}

runMigration().catch(err => {
  console.error('Fatal Migration Error:', err);
  process.exit(1);
});
