import fs from 'fs';
import path from 'path';

const productsPath = path.join(process.cwd(), 'server', 'data', 'products.json');
const products = JSON.parse(fs.readFileSync(productsPath, 'utf8'));

// Get all WhatsApp images in public/images
const waFiles = fs.readdirSync(path.join(process.cwd(), 'public', 'images'))
  .filter(f => f.startsWith('IMG-20260902-WA') && (f.endsWith('.jpg') || f.endsWith('.png')))
  .sort();

console.log('Found WA files:', waFiles.length);

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

// Fallback high quality category photos if needed
const categoryFallbacks = {
  roll: 'spring_roll_crispy.jpg',
  pizza: 'mini_pizza_real.jpg',
  special: 'nuggets_real.jpg',
  samosa: 'samosa_classic.jpg',
  kabab: 'shami_kabab_real.jpg'
};

let waIndex = 0;

const updatedProducts = products.map((prod) => {
  // If already Base64, keep it!
  if (prod.image && prod.image.startsWith('data:image/')) {
    return prod;
  }

  // If broken path /images/img-...
  if (!prod.image || prod.image.includes('/images/img-') || prod.image.startsWith('/images/')) {
    // Try WA file first
    if (waIndex < waFiles.length) {
      const waFile = waFiles[waIndex];
      waIndex++;
      const b64 = fileToBase64(waFile);
      if (b64) {
        console.log(`Mapped ${prod.id} (${prod.name}) to WA file ${waFile}`);
        return { ...prod, image: b64 };
      }
    }

    // Try category fallback
    const fallbackFile = categoryFallbacks[prod.category] || 'nuggets_real.jpg';
    const b64Fallback = fileToBase64(fallbackFile);
    if (b64Fallback) {
      console.log(`Mapped ${prod.id} (${prod.name}) to fallback ${fallbackFile}`);
      return { ...prod, image: b64Fallback };
    }
  }

  return prod;
});

fs.writeFileSync(productsPath, JSON.stringify(updatedProducts, null, 2), 'utf8');

const totalBase64 = updatedProducts.filter(p => p.image && p.image.startsWith('data:image/')).length;
console.log(`DONE! Total 62 products updated. Base64 count: ${totalBase64} / 62`);
