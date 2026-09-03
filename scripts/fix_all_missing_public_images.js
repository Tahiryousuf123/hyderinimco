import fs from 'fs';
import path from 'path';

const backupPath = path.join(process.cwd(), 'dist', 'images', 'hyderi_catalog_backup_1788397593035.json');
const productsPath = path.join(process.cwd(), 'server', 'data', 'products.json');

const backup = JSON.parse(fs.readFileSync(backupPath, 'utf8'));
const products = JSON.parse(fs.readFileSync(productsPath, 'utf8'));

const backupMap = new Map();
backup.forEach(p => backupMap.set(p.id, p));

// Helper to convert local image file to base64
function fileToBase64(fileName) {
  const filePath = path.join(process.cwd(), 'public', 'images', fileName);
  if (fs.existsSync(filePath)) {
    const ext = path.extname(fileName).toLowerCase().replace('.', '') || 'jpeg';
    const mime = ext === 'png' ? 'image/png' : 'image/jpeg';
    const buf = fs.readFileSync(filePath);
    return `data:${mime};base64,${buf.toString('base64')}`;
  }
  return null;
}

let fixedCount = 0;

const updatedProducts = products.map((prod) => {
  const backupProd = backupMap.get(prod.id);

  // 1. If backup has a Base64 image, use it!
  if (backupProd && backupProd.image && backupProd.image.startsWith('data:image/')) {
    fixedCount++;
    return { ...prod, image: backupProd.image };
  }

  // 2. If current prod image is a broken /images/img-... path, check backup or fallback
  if (!prod.image || prod.image.includes('/images/img-')) {
    if (backupProd && backupProd.image && backupProd.image.startsWith('data:image/')) {
      fixedCount++;
      return { ...prod, image: backupProd.image };
    }
  }

  // 3. If prod.image points to a static file in public/images/ (e.g. /images/premium_deal_5_poster.jpg), convert file to Base64 for 100% reliability
  if (prod.image && prod.image.startsWith('/images/')) {
    const baseName = path.basename(prod.image);
    const b64 = fileToBase64(baseName);
    if (b64) {
      fixedCount++;
      return { ...prod, image: b64 };
    }
  }

  return prod;
});

// Save updated products to server/data/products.json
fs.writeFileSync(productsPath, JSON.stringify(updatedProducts, null, 2), 'utf8');

console.log(`Successfully fixed ${fixedCount} product images in products.json!`);
