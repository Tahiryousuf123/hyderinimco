import fs from 'fs';

let content = fs.readFileSync('./scripts/build_luxury_theme.js', 'utf8');

// 1. Add state isSavingProd to AdminPortal
content = content.replace(
  `const [editProd, setEditProd] = useState(null);`,
  `const [editProd, setEditProd] = useState(null);\n      const [isSavingProd, setIsSavingProd] = useState(false);`
);

// 2. Add compressImageFile helper and update handleSaveProduct
const oldSaveProd = `      const handleSaveProduct = async (e) => {
        e.preventDefault();
        try {
          const url = editProd ? \`/api/products/\${editProd.id}\` : '/api/products';
          const method = editProd ? 'PUT' : 'POST';
          await fetch(url, {
            method,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(prodForm)
          });
          setShowAddProd(false);
          setEditProd(null);
          onRefreshProducts();
        } catch (e) {
          setShowAddProd(false);
          onRefreshProducts();
        }
      };`;

const newSaveProd = `      const compressImageFile = (file) => {
        return new Promise((resolve) => {
          const reader = new FileReader();
          reader.onload = (ev) => {
            const img = new Image();
            img.onload = () => {
              const canvas = document.createElement('canvas');
              let w = img.width;
              let h = img.height;
              const max = 800;
              if (w > max || h > max) {
                if (w > h) {
                  h = Math.round((h * max) / w);
                  w = max;
                } else {
                  w = Math.round((w * max) / h);
                  h = max;
                }
              }
              canvas.width = w;
              canvas.height = h;
              const ctx = canvas.getContext('2d');
              ctx.drawImage(img, 0, 0, w, h);
              resolve(canvas.toDataURL('image/jpeg', 0.82));
            };
            img.onerror = () => resolve(ev.target.result);
            img.src = ev.target.result;
          };
          reader.readAsDataURL(file);
        });
      };

      const handleSaveProduct = async (e) => {
        e.preventDefault();
        setIsSavingProd(true);
        try {
          const url = editProd ? \`/api/products/\${editProd.id}\` : '/api/products';
          const method = editProd ? 'PUT' : 'POST';
          const res = await fetch(url, {
            method,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(prodForm)
          });
          const data = await res.json();
          if (data.success) {
            setShowAddProd(false);
            setEditProd(null);
            onRefreshProducts();
          } else {
            alert(data.message || 'Failed to save product');
          }
        } catch (err) {
          alert('Error saving product: ' + err.message);
        } finally {
          setIsSavingProd(false);
        }
      };`;

content = content.replace(oldSaveProd, newSaveProd);

// 3. Update file input onChange in modal
const oldFileInput = `                              onChange={(e) => {
                                const file = e.target.files[0];
                                if (file) {
                                  const reader = new FileReader();
                                  reader.onloadend = () => {
                                    setProdForm(prev => ({
                                      ...prev,
                                      imageBase64: reader.result,
                                      image: reader.result
                                    }));
                                  };
                                  reader.readAsDataURL(file);
                                }
                              }}`;

const newFileInput = `                              onChange={async (e) => {
                                const file = e.target.files[0];
                                if (file) {
                                  try {
                                    const compressed = await compressImageFile(file);
                                    setProdForm(prev => ({
                                      ...prev,
                                      imageBase64: compressed,
                                      image: compressed
                                    }));
                                  } catch (err) {
                                    console.error('Compression error:', err);
                                  }
                                }
                              }}`;

content = content.replace(oldFileInput, newFileInput);

// 4. Clean up Image URL display text in text field
content = content.replace(
  `value={prodForm.image || ''}`,
  `value={prodForm.image && prodForm.image.startsWith('data:image') ? '[Uploaded Image Selected]' : (prodForm.image || '')}`
);

// 5. Update submit button text with loading state
content = content.replace(
  `{editProd ? 'Update Product Details' : 'Save New Product'}`,
  `{isSavingProd ? '⏳ Saving Product & Image...' : (editProd ? 'Update Product Details' : 'Save New Product')}`
);

fs.writeFileSync('./scripts/build_luxury_theme.js', content, 'utf8');
console.log('SUCCESS: Fully patched Admin Product Image Upload!');
