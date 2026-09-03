import fs from 'fs';

let content = fs.readFileSync('./scripts/build_luxury_theme.js', 'utf8');

const target = `{tab === 'products' && (\n                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">`;

const replacement = `{tab === 'products' && (
                    <div className="space-y-4">
                      <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-4 rounded-3xl border border-goldBrand-400/40 shadow-xs">
                        <div>
                          <h4 className="font-black text-sm text-emeraldBrand-950 font-serifBrand">📦 Products Catalog ({products.length} Items)</h4>
                          <p className="text-[11px] text-gray-500">Download JSON backup or restore custom catalog pictures anytime.</p>
                        </div>
                        <div className="flex flex-wrap items-center gap-2">
                          <button
                            type="button"
                            onClick={() => {
                              const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(products, null, 2));
                              const downloadAnchor = document.createElement('a');
                              downloadAnchor.setAttribute("href", dataStr);
                              downloadAnchor.setAttribute("download", "hyderi_products_catalog.json");
                              document.body.appendChild(downloadAnchor);
                              downloadAnchor.click();
                              downloadAnchor.remove();
                            }}
                            className="px-3.5 py-2 bg-goldBrand-500 hover:bg-goldBrand-600 text-black font-black border border-goldBrand-400 rounded-xl text-xs shadow-md transition-all flex items-center gap-1.5 cursor-pointer active:scale-95"
                          >
                            <span>📥</span>
                            <span>Download Catalog Backup (JSON)</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => {
                              const input = document.createElement('input');
                              input.type = 'file';
                              input.accept = 'application/json';
                              input.onchange = (e) => {
                                const file = e.target.files[0];
                                if (!file) return;
                                const reader = new FileReader();
                                reader.onload = (event) => {
                                  try {
                                    const imported = JSON.parse(event.target.result);
                                    if (Array.isArray(imported) && imported.length > 0) {
                                      if (typeof setProducts === 'function') setProducts(imported);
                                      try { localStorage.setItem('hyderi_custom_products', JSON.stringify(imported)); } catch (err) {}
                                      fetch('/api/products/batch', {
                                        method: 'POST',
                                        headers: { 'Content-Type': 'application/json' },
                                        body: JSON.stringify({ products: imported })
                                      }).catch(() => {});
                                      alert('✅ Catalog Restored Successfully! All ' + imported.length + ' products & pictures updated.');
                                    }
                                  } catch (err) { alert('Invalid JSON file format.'); }
                                };
                                reader.readAsText(file);
                              };
                              input.click();
                            }}
                            className="px-3.5 py-2 bg-emeraldBrand-900 hover:bg-emeraldBrand-950 text-white font-black border border-emeraldBrand-700 rounded-xl text-xs shadow-md transition-all flex items-center gap-1.5 cursor-pointer active:scale-95"
                          >
                            <span>📤</span>
                            <span>Restore Catalog JSON</span>
                          </button>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">`;

if (content.includes('{tab === \'products\' && (')) {
  content = content.replace('{tab === \'products\' && (\n                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">', replacement);
  content = content.replace(
    `                        </div>
                      ))}
                    </div>
                  )}`,
    `                        </div>
                      ))}
                    </div>
                    </div>
                  )}`
  );
  fs.writeFileSync('./scripts/build_luxury_theme.js', content, 'utf8');
  console.log('SUCCESS: Patched build_luxury_theme.js with Download Catalog Backup button!');
} else {
  console.error('tab === products not found');
}
