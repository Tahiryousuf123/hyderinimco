import fs from 'fs';

const productsJson = fs.readFileSync('./server/data/products.json', 'utf8');

let content = fs.readFileSync('./scripts/build_luxury_theme.js', 'utf8');

// Insert const INITIAL_PRODUCTS right above function HyderiLogoEmblem
const target = `    // Official Hyderi Badge Logo Emblem Component`;
const replacement = `    const INITIAL_PRODUCTS = ${productsJson};

    // Official Hyderi Badge Logo Emblem Component`;

if (!content.includes('const INITIAL_PRODUCTS =')) {
  content = content.replace(target, replacement);
  console.log('SUCCESS: Inserted const INITIAL_PRODUCTS into build_luxury_theme.js!');
  fs.writeFileSync('./scripts/build_luxury_theme.js', content, 'utf8');
} else {
  console.log('INITIAL_PRODUCTS already defined.');
}
