import fs from 'fs';

let content = fs.readFileSync('./scripts/build_luxury_theme.js', 'utf8');

const lines = content.split('\n');

for (let i = 0; i < lines.length; i++) {
  // 1. Initial state
  if (lines[i].includes("const [products, setProducts] = useState([]);")) {
    lines[i] = `      const [products, setProducts] = useState(() => {
        try {
          const saved = localStorage.getItem('hyderi_custom_products');
          if (saved) {
            const parsed = JSON.parse(saved);
            if (Array.isArray(parsed) && parsed.length > 0) return parsed;
          }
        } catch (e) {}
        return INITIAL_PRODUCTS;
      });`;
    console.log('SUCCESS 1: Patched initial state at line', i + 1);
  }

  // 2. loadProducts function
  if (lines[i].includes('const loadProducts = async () => {')) {
    lines[i] = `      const loadProducts = async () => {
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
      };
      const _dummy_loadProducts = async () => {`;
    console.log('SUCCESS 2: Patched loadProducts at line', i + 1);
  }
}

content = lines.join('\n');
// Clean dummy function
content = content.replace(`      const _dummy_loadProducts = async () => {\n        try {\n          const res = await fetch('/api/products');\n          const data = await res.json();\n          if (data.success && data.products) {\n            setProducts(data.products);\n          }\n        } catch (e) {}\n      };`, '');

fs.writeFileSync('./scripts/build_luxury_theme.js', content, 'utf8');
