import fs from 'fs';

let content = fs.readFileSync('./scripts/build_luxury_theme.js', 'utf8');

// 1. Add state isSavingProd
const stateTarget = `const [editProd, setEditProd] = useState(null);`;
const stateReplacement = stateTarget + `\n      const [isSavingProd, setIsSavingProd] = useState(false);`;

if (content.includes(stateTarget)) {
  content = content.replace(stateTarget, stateReplacement);
  console.log('SUCCESS: Added isSavingProd state');
}

// 2. Add compressImageFile helper and update handleSaveProduct
const saveProdTarget = `      const handleSaveProduct = async (e) => {
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

const saveProdReplacement = `      const compressImageFile = (file) => {
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

if (content.includes(saveProdTarget)) {
  content = content.replace(saveProdTarget, saveProdReplacement);
  console.log('SUCCESS: Updated handleSaveProduct & compressImageFile');
} else {
  console.error('ERROR: saveProdTarget not found');
}

// 3. Update file input onChange and text input value in modal
const inputTarget = `                              onChange={(e) => {
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

const inputReplacement = `                              onChange={async (e) => {
                                const file = e.target.files[0];
                                if (file) {
                                  const compressed = await compressImageFile(file);
                                  setProdForm(prev => ({
                                    ...prev,
                                    imageBase64: compressed,
                                    image: compressed
                                  }));
                                }
                              }}`;

if (content.includes(inputTarget)) {
  content = content.replace(inputTarget, inputReplacement);
  console.log('SUCCESS: Updated file input onChange');
} else {
  console.error('ERROR: inputTarget not found');
}

// 4. Update submit button text with loading state
const btnTarget = `{editProd ? 'Update Product Details' : 'Save New Product'}`;
const btnReplacement = `{isSavingProd ? '⏳ Saving Product & Image...' : (editProd ? 'Update Product Details' : 'Save New Product')}`;

if (content.includes(btnTarget)) {
  content = content.replace(btnTarget, btnReplacement);
  console.log('SUCCESS: Updated button text with isSavingProd state');
}

fs.writeFileSync('./scripts/build_luxury_theme.js', content, 'utf8');
