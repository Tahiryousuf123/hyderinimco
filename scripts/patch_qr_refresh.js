import fs from 'fs';

let content = fs.readFileSync('./scripts/build_luxury_theme.js', 'utf8');

const target = `<p className="text-[10px] text-emeraldBrand-100">Generating live handshake QR code. Please wait 3-5 seconds.</p>
                            </div>`;

const replacement = `<p className="text-[10px] text-emeraldBrand-100">Generating live handshake QR code. Please wait 3-5 seconds.</p>
                              <button
                                type="button"
                                onClick={() => {
                                  fetch('/api/whatsapp/status')
                                    .then(res => res.json())
                                    .then(data => { if (data.success) setWaStatus(data); })
                                    .catch(() => {});
                                }}
                                className="px-3.5 py-1.5 bg-goldBrand-500/20 hover:bg-goldBrand-500/30 text-goldBrand-300 border border-goldBrand-400/50 rounded-xl text-[10px] font-bold cursor-pointer transition-all active:scale-95"
                              >
                                🔄 Refresh QR Code / Status
                              </button>
                            </div>`;

if (content.includes(target)) {
  content = content.replace(target, replacement);
  console.log('SUCCESS: Added Refresh QR Code button!');
  fs.writeFileSync('./scripts/build_luxury_theme.js', content, 'utf8');
} else {
  console.error('ERROR: target not found');
}
