import fs from 'fs';

let content = fs.readFileSync('./scripts/build_luxury_theme.js', 'utf8');
const lines = content.split('\n');

for (let i = 0; i < lines.length; i++) {
  if (lines[i].includes('const handleSaveProduct = async (e) => {')) {
    let j = i;
    while (j < lines.length && !lines[j].includes('const handleDeleteProduct')) {
      j++;
    }
    const replacement = `      const handleSaveProduct = async (e) => {
        e.preventDefault();
        const updatedProd = {
          id: editProd ? editProd.id : 'prod-' + Date.now(),
          ...prodForm
        };

        // 1. Instant Optimistic UI Update (0.01s Instant Feedback!)
        setShowAddProd(false);
        setEditProd(null);

        setProducts(prev => {
          let next;
          if (editProd) {
            next = prev.map(p => p.id === editProd.id ? { ...p, ...updatedProd } : p);
          } else {
            next = [updatedProd, ...prev];
          }
          try { localStorage.setItem('hyderi_custom_products', JSON.stringify(next)); } catch (err) {}
          return next;
        });

        // 2. Background Server Sync (Non-blocking)
        try {
          const url = editProd ? \`/api/products/\${editProd.id}\` : '/api/products';
          const method = editProd ? 'PUT' : 'POST';
          fetch(url, {
            method,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(prodForm)
          }).catch(() => {});
        } catch (err) {}
      };\n`;

    lines.splice(i, j - i, replacement);
    console.log('SUCCESS: Replaced handleSaveProduct at line', i + 1);
    break;
  }
}

fs.writeFileSync('./scripts/build_luxury_theme.js', lines.join('\n'), 'utf8');
