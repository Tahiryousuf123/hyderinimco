import https from 'https';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const outDir = path.join(__dirname, '..', 'public', 'images');
if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

// 100% REAL AUTHENTIC HIGH-RES FOOD PHOTOGRAPHY
const photos = {
  // Samosas
  'samosa_classic': 'https://images.unsplash.com/photo-1601050690597-df0568f70950?w=700&auto=format&fit=crop&q=85',
  'samosa_onebite': 'https://images.unsplash.com/photo-1589301760014-d929f3979dbc?w=700&auto=format&fit=crop&q=85',
  'wonton_crispy': 'https://images.unsplash.com/photo-1541696432-82c6da8ce7bf?w=700&auto=format&fit=crop&q=85',
  
  // Spring Rolls
  'spring_roll_crispy': 'https://images.unsplash.com/photo-1548943487-a2e4e43b4853?w=700&auto=format&fit=crop&q=85',
  'spring_roll_golden': 'https://images.unsplash.com/photo-1563245372-f21724e3856d?w=700&auto=format&fit=crop&q=85',
  
  // Kababs
  'shami_kabab_real': 'https://images.unsplash.com/photo-1529042410759-befb1204b468?w=700&auto=format&fit=crop&q=85',
  'seekh_kabab_real': 'https://images.unsplash.com/photo-1555939594-58d7cb561ad1?w=700&auto=format&fit=crop&q=85',
  'chapli_kabab_real': 'https://images.unsplash.com/photo-1529042410759-befb1204b468?w=700&auto=format&fit=crop&q=85',
  
  // Momos
  'momos_steamed_real': 'https://images.unsplash.com/photo-1534422298391-e4f8c172dddb?w=700&auto=format&fit=crop&q=85',
  'momos_fried_real': 'https://images.unsplash.com/photo-1541696432-82c6da8ce7bf?w=700&auto=format&fit=crop&q=85',
  
  // Mini Pizza
  'mini_pizza_real': 'https://images.unsplash.com/photo-1513104890138-7c749659a591?w=700&auto=format&fit=crop&q=85',
  
  // Snacks & Bites
  'nuggets_real': 'https://images.unsplash.com/photo-1562967914-608f82629710?w=700&auto=format&fit=crop&q=85',
  'french_fries_real': 'https://images.unsplash.com/photo-1573080496219-bb080dd4f877?w=700&auto=format&fit=crop&q=85',
  
  // Paratha & Nimco
  'paratha_real': 'https://images.unsplash.com/photo-1601050690597-df0568f70950?w=700&auto=format&fit=crop&q=85',
  'nimco_real': 'https://images.unsplash.com/photo-1606491956689-2ea866880c84?w=700&auto=format&fit=crop&q=85'
};

const entries = Object.entries(photos);
let downloaded = 0;

for (const [key, url] of entries) {
  const dest = path.join(outDir, `${key}.jpg`);
  const file = fs.createWriteStream(dest);
  https.get(url, (res) => {
    if (res.statusCode === 200) {
      res.pipe(file);
      file.on('finish', () => {
        downloaded++;
        console.log(`[${downloaded}/${entries.length}] Downloaded real photo: ${key}.jpg (${fs.statSync(dest).size} bytes)`);
      });
    } else {
      console.log(`Failed: ${key} (status: ${res.statusCode})`);
    }
  });
}
