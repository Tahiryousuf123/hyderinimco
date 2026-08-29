import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const outDir = path.join(__dirname, '..', 'public', 'images');
if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

const productsPath = path.join(__dirname, '..', 'server', 'data', 'products.json');
const products = JSON.parse(fs.readFileSync(productsPath, 'utf8'));

// Palette of rich appetizing culinary gradients
const gradients = {
  samosa: ['#b45309', '#78350f', '#f59e0b', '#d97706'],
  roll: ['#c2410c', '#7c2d12', '#fb923c', '#ea580c'],
  kabab: ['#991b1b', '#450a0a', '#ef4444', '#b91c1c'],
  pizza: ['#b91c1c', '#7f1d1d', '#f97316', '#dc2626'],
  special: ['#c2410c', '#854d0e', '#facc15', '#ea580c'],
  patti: ['#ca8a04', '#713f12', '#fde047', '#eab308'],
  nimco: ['#d97706', '#78350f', '#fbbf24', '#b45309']
};

const foodIcons = {
  samosa: '🥟',
  roll: '🌯',
  kabab: '🍢',
  pizza: '🍕',
  special: '🍗',
  patti: '🫓',
  nimco: '🥜'
};

const basePhotos = {
  samosa: 'samosa.jpg',
  roll: 'spring_roll.jpg',
  kabab: 'shami_kabab.jpg',
  pizza: 'mini_pizza.jpg',
  special: 'nuggets.jpg',
  patti: 'paratha.jpg',
  nimco: 'nimco.jpg'
};

products.forEach((p, idx) => {
  const num = idx + 1;
  const filename = `prod_${num}.svg`;
  const filepath = path.join(outDir, filename);

  const colors = gradients[p.category] || gradients.samosa;
  const icon = foodIcons[p.category] || '🥟';
  const badgeText = p.badge || (p.featured ? 'Hyderi Special' : 'Fresh Frozen');
  const baseImg = basePhotos[p.category] || 'samosa.jpg';

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 450" width="600" height="450">
  <defs>
    <linearGradient id="grad_${num}" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="${colors[1]}" />
      <stop offset="50%" stop-color="${colors[0]}" />
      <stop offset="100%" stop-color="${colors[3]}" />
    </linearGradient>
    <radialGradient id="glow_${num}" cx="50%" cy="45%" r="60%">
      <stop offset="0%" stop-color="${colors[2]}" stop-opacity="0.35" />
      <stop offset="100%" stop-color="#000000" stop-opacity="0.85" />
    </radialGradient>
    <filter id="shadow_${num}" x="-10%" y="-10%" width="130%" height="130%">
      <feDropShadow dx="0" dy="12" stdDeviation="14" flood-color="#000000" flood-opacity="0.6" />
    </filter>
  </defs>

  <!-- Background Base -->
  <rect width="600" height="450" fill="url(#grad_${num})" />
  
  <!-- Image overlay with category food texture -->
  <image href="/images/${baseImg}" width="600" height="450" preserveAspectRatio="xMidYMid slice" opacity="0.55" />
  <rect width="600" height="450" fill="url(#glow_${num})" />

  <!-- Geometric Frame Pattern -->
  <rect x="16" y="16" width="568" height="418" rx="24" fill="none" stroke="${colors[2]}" stroke-width="2" stroke-dasharray="6,6" opacity="0.6" />
  <rect x="22" y="22" width="556" height="406" rx="20" fill="none" stroke="#ffffff" stroke-width="1.5" opacity="0.2" />

  <!-- Center Decorative Glow Circle -->
  <circle cx="300" cy="180" r="110" fill="${colors[2]}" opacity="0.25" />
  
  <!-- Main Food Emoticon Visual -->
  <g filter="url(#shadow_${num})">
    <circle cx="300" cy="175" r="85" fill="#ffffff" fill-opacity="0.15" stroke="#ffffff" stroke-width="3" stroke-opacity="0.4" />
    <text x="300" y="215" font-size="95" text-anchor="middle" font-family="Apple Color Emoji, Segoe UI Emoji, sans-serif">${icon}</text>
  </g>

  <!-- Top Badge: Category and Pack Quantity -->
  <g>
    <rect x="35" y="35" rx="10" ry="10" width="150" height="32" fill="#b91c1c" stroke="#fde047" stroke-width="1.5" />
    <text x="110" y="56" fill="#ffffff" font-size="12" font-weight="bold" text-anchor="middle" font-family="'Plus Jakarta Sans', sans-serif" letter-spacing="1">${badgeText.toUpperCase()}</text>
  </g>

  <g>
    <rect x="430" y="35" rx="10" ry="10" width="135" height="34" fill="#000000" fill-opacity="0.85" stroke="#f59e0b" stroke-width="1.5" />
    <text x="497" y="57" fill="#fef08a" font-size="14" font-weight="900" text-anchor="middle" font-family="'Outfit', 'Plus Jakarta Sans', sans-serif">${p.packQuantity}</text>
  </g>

  <!-- Halal &amp; Fresh Badge -->
  <g>
    <circle cx="530" cy="120" r="26" fill="#065f46" stroke="#34d399" stroke-width="2" />
    <text x="530" y="118" fill="#ffffff" font-size="8" font-weight="bold" text-anchor="middle" font-family="sans-serif">100% HALAL</text>
    <text x="530" y="130" fill="#a7f3d0" font-size="8" font-weight="bold" text-anchor="middle" font-family="sans-serif">حلال خالص</text>
  </g>

  <!-- Bottom Details Card -->
  <rect x="30" y="280" rx="18" ry="18" width="540" height="135" fill="#0f172a" fill-opacity="0.9" stroke="#f59e0b" stroke-width="1.5" />
  
  <!-- Urdu Product Name -->
  <text x="300" y="322" fill="#fef08a" font-size="24" font-weight="bold" text-anchor="middle" font-family="'Noto Nastaliq Urdu', 'Segoe UI', serif">${p.nameUrdu}</text>
  
  <!-- English Product Name -->
  <text x="300" y="355" fill="#ffffff" font-size="18" font-weight="800" text-anchor="middle" font-family="'Outfit', 'Plus Jakarta Sans', sans-serif">${p.name}</text>

  <!-- Pricing &amp; Quality Bar -->
  <line x1="60" y1="372" x2="540" y2="372" stroke="#334155" stroke-width="1" />
  
  <text x="70" y="395" fill="#94a3b8" font-size="12" font-weight="bold" font-family="sans-serif">AUTHENTIC HYDERI (SINCE 1970)</text>
  <text x="530" y="397" fill="#38bdf8" font-size="16" font-weight="900" text-anchor="end" font-family="'Outfit', sans-serif">Rs. ${p.price}/-</text>
</svg>`;

  fs.writeFileSync(filepath, svg, 'utf8');
  p.image = `/images/${filename}`;
});

fs.writeFileSync(productsPath, JSON.stringify(products, null, 2), 'utf8');
console.log(`Generated ${products.length} distinct product image graphics successfully!`);
