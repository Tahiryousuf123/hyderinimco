import fs from 'fs';

let content = fs.readFileSync('./scripts/build_luxury_theme.js', 'utf8');

const loadTarget = `      const loadProducts = async () => {
        try {
          const res = await fetch('/api/products');
          const data = await res.json();
          if (data.success && data.products) {
            setProducts(data.products);
          }
        } catch (e) {}
      };`;

const loadReplacement = `      const loadProducts = async () => {
        try {
          const res = await fetch('/api/products');
          const data = await res.json();
          if (data.success && Array.isArray(data.products) && data.products.length > 0) {
            setProducts(data.products);
            try {
              localStorage.setItem('hyderi_custom_products', JSON.stringify(data.products));
            } catch (e) {}
          }
        } catch (e) {}
      };`;

if (content.includes(loadTarget)) {
  content = content.replace(loadTarget, loadReplacement);
  console.log('SUCCESS 2: loadProducts function with localStorage sync');
  fs.writeFileSync('./scripts/build_luxury_theme.js', content, 'utf8');
} else {
  console.error('ERROR: loadTarget not found');
}
