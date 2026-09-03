import fs from 'fs';

let content = fs.readFileSync('./scripts/build_luxury_theme.js', 'utf8');

const targetStr = `                        <span>Bank & Store Settings</span>
                      </button>
                    )}
                  </div>`;

const replacementStr = `                        <span>Bank & Store Settings</span>
                      </button>
                    )}
                  </div>

                  {orders.length > 0 && (
                    <button
                      onClick={async () => {
                        if (confirm('Are you sure you want to delete all test/sample orders? This will reset sales stats to 0.')) {
                          await fetch('/api/orders/all', { method: 'DELETE' });
                          fetchOrders();
                        }
                      }}
                      className="px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-black shadow transition-all flex items-center gap-1"
                      title="Clear all test orders and reset sales dashboard"
                    >
                      <span>🗑️</span>
                      <span>Clear All Test Orders</span>
                    </button>
                  )}`;

if (!content.includes(targetStr)) {
  console.error('ERROR: targetStr not found!');
  process.exit(1);
}

content = content.replace(targetStr, replacementStr);

fs.writeFileSync('./scripts/build_luxury_theme.js', content, 'utf8');
console.log('SUCCESS: Added Clear All Test Orders button to AdminPortal!');
