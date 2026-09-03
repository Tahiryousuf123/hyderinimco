import fs from 'fs';

let content = fs.readFileSync('./scripts/build_luxury_theme.js', 'utf8');

// 1. Update initial state of products
const initTarget = `const [products, setProducts] = useState([]);`;
const initReplacement = `const [products, setProducts] = useState(() => {
        try {
          const saved = localStorage.getItem('hyderi_custom_products');
          if (saved) {
            const parsed = JSON.parse(saved);
            if (Array.isArray(parsed) && parsed.length > 0) return parsed;
          }
        } catch (e) {}
        return INITIAL_PRODUCTS;
      });`;

if (content.includes(initTarget)) {
  content = content.replace(initTarget, initReplacement);
  console.log('SUCCESS: Updated initial products state with localStorage persistence');
}

// 2. Update loadProducts function
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
  console.log('SUCCESS: Updated loadProducts function to sync with localStorage');
}

fs.writeFileSync('./scripts/build_luxury_theme.js', content, 'utf8');
