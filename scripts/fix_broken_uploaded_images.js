import { connectDB, isDBConnected } from '../server/db.js';
import { Product } from '../server/models/Product.js';

async function checkAndFixImages() {
  await connectDB();
  if (isDBConnected()) {
    const products = await Product.find({}).lean();
    console.log(`Found ${products.length} products in MongoDB Atlas.`);

    const broken = products.filter(p => p.image && p.image.startsWith('/images/img-'));
    console.log(`Products with broken uploaded image paths (/images/img-...): ${broken.length}`);

    for (const p of broken) {
      console.log(`- Product "${p.name}" (ID: ${p.id}) has image path: ${p.image}`);
    }
  } else {
    console.log('MongoDB Atlas not connected via MONGODB_URI.');
  }
  process.exit(0);
}

checkAndFixImages().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
