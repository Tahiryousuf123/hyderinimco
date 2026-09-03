import { connectDB, isDBConnected } from '../server/db.js';
import { Product } from '../server/models/Product.js';

async function checkProductSizes() {
  await connectDB();
  if (isDBConnected()) {
    const products = await Product.find({}).lean();
    console.log(`Total products in DB: ${products.length}`);

    let totalSize = 0;
    for (const p of products) {
      const imgLen = (p.image || '').length;
      totalSize += imgLen;
      if (imgLen > 100000) { // Larger than 100KB
        console.log(`⚠️ HUGE IMAGE PRODUCT: "${p.name}" (ID: ${p.id}) - Base64 Size: ${(imgLen / 1024 / 1024).toFixed(2)} MB`);
      }
    }
    console.log(`Total images payload size: ${(totalSize / 1024 / 1024).toFixed(2)} MB`);
  }
  process.exit(0);
}

checkProductSizes().catch(err => {
  console.error(err);
  process.exit(1);
});
