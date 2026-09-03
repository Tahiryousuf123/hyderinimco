import fs from 'fs';

let content = fs.readFileSync('./scripts/build_luxury_theme.js', 'utf8');

const target = `            const merged = data.products.map(p => {
              const localMatch = customList.find(c => c.id === p.id);
              if (localMatch && localMatch.image && localMatch.image.startsWith('data:image')) {
                return { ...p, image: localMatch.image };
              }
              return p;
            });

            setProducts(merged);`;

const replacement = `            const mergedMap = new Map();
            data.products.forEach(p => mergedMap.set(p.id, p));
            if (Array.isArray(customList)) {
              customList.forEach(p => {
                if (p && p.id) {
                  const existing = mergedMap.get(p.id);
                  mergedMap.set(p.id, { ...existing, ...p });
                }
              });
            }

            const merged = Array.from(mergedMap.values());
            setProducts(merged);`;

// Normalize \r\n to \n for matching
const normContent = content.replace(/\r\n/g, '\n');
const normTarget = target.replace(/\r\n/g, '\n');
const normReplacement = replacement.replace(/\r\n/g, '\n');

if (normContent.includes(normTarget)) {
  const updated = normContent.replace(normTarget, normReplacement);
  fs.writeFileSync('./scripts/build_luxury_theme.js', updated, 'utf8');
  console.log('✅ SUCCESS: Patched loadProducts Map merge logic!');
} else {
  console.error('❌ ERROR: Target chunk not found in build_luxury_theme.js');
}
