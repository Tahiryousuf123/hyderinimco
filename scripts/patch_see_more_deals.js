import fs from 'fs';

let content = fs.readFileSync('./scripts/build_luxury_theme.js', 'utf8');

// 1. Add state showMoreDealsModal
const stateTarget = `const [isBrochureModalOpen, setIsBrochureModalOpen] = useState(false);`;
const stateReplacement = stateTarget + `\n      const [showMoreDealsModal, setShowMoreDealsModal] = useState(false);`;

if (!content.includes(stateTarget)) {
  console.error('State target not found');
  process.exit(1);
}
content = content.replace(stateTarget, stateReplacement);

// 2. Add See More Deals Button in Hero Showcase
const btnTarget = `</div>\n            </section>`;
const btnReplacement = `  {/* See More Deals Button */}
              <div className="mt-8 relative z-10 text-center">
                <button
                  onClick={() => setShowMoreDealsModal(true)}
                  className="w-full py-4 bg-gradient-to-r from-goldBrand-500 via-amber-400 to-goldBrand-500 hover:from-goldBrand-400 hover:to-goldBrand-400 text-emeraldBrand-950 font-black text-sm sm:text-base rounded-2xl shadow-xl transition-all hover:scale-[1.01] active:scale-[0.99] border-2 border-goldBrand-300 flex items-center justify-center gap-2 group cursor-pointer"
                >
                  <span className="text-lg group-hover:rotate-12 transition-transform">🔥</span>
                  <span>{isUrdu ? 'پانچ مزید پریمیم ڈیلز دیکھیں (See More Deals)' : 'See More Deals (Explore All 5 Premium Deals)'}</span>
                  <span className="text-xs bg-emeraldBrand-950 text-goldBrand-300 px-3 py-1 rounded-full font-bold border border-goldBrand-400">5 NEW DEALS</span>
                </button>
              </div>
            </div>
            </section>`;

if (!content.includes(btnTarget)) {
  console.error('Btn target not found');
  process.exit(1);
}
content = content.replace(btnTarget, btnReplacement);

// 3. Add PremiumDealsModal rendering
const modalTarget = `{/* Discreet Admin Portal */}`;
const modalReplacement = `{/* Premium Deals Modal */}
          {showMoreDealsModal && (
            <div className="fixed inset-0 z-50 overflow-y-auto bg-black/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-6">
              <div className="relative bg-emeraldBrand-950 text-white rounded-3xl max-w-6xl w-full max-h-[92vh] overflow-y-auto shadow-2xl flex flex-col border-2 border-goldBrand-400 p-4 sm:p-8">
                
                {/* Header */}
                <div className="flex items-center justify-between border-b border-goldBrand-400/40 pb-4 mb-6">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="bg-amber-500 text-emeraldBrand-950 text-[10px] font-black px-2.5 py-0.5 rounded-full uppercase">🔥 EXCLUSIVE MENU</span>
                      <h2 className="text-xl sm:text-3xl font-black text-goldBrand-300 font-serifBrand">Hyderi Premium Deals Showcase</h2>
                    </div>
                    <p className="text-xs sm:text-sm text-goldBrand-100/90 mt-1">Select from our 5 exclusive handcrafted combo deals with 100% Free Express Delivery!</p>
                  </div>
                  <button
                    onClick={() => setShowMoreDealsModal(false)}
                    className="w-10 h-10 rounded-full bg-emeraldBrand-900 text-goldBrand-300 hover:text-white flex items-center justify-center font-bold text-lg border border-goldBrand-500/40 cursor-pointer"
                  >
                    ✕
                  </button>
                </div>

                {/* Grid of 5 Premium Deals */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {[
                    {
                      id: 'deal-prem-1',
                      title: 'Hyderi Premium Deal 1',
                      titleUrdu: 'حیدری پریمیم ڈیل ۱',
                      price: 2600,
                      pcs: '46 pcs Mega Variety',
                      image: '/images/premium_deal_1_poster.jpg',
                      items: ['BBQ Roll (12 pcs)', 'Malai Boti Samosa (12 pcs)', 'Beef Chapli (6 pcs)', 'Chimmy Changa (6 pcs)', 'Chicken Finger (10 pcs)']
                    },
                    {
                      id: 'deal-prem-2',
                      title: 'Hyderi Premium Deal 2',
                      titleUrdu: 'حیدری پریمیم ڈیل ۲',
                      price: 2550,
                      pcs: '84 pcs Family Variety',
                      image: '/images/premium_deal_2_poster.jpg',
                      items: ['Mint Roll (12 pcs)', 'Aloo One Bite Samosa (24 pcs)', 'Cheese Ball (12 pcs)', 'Wonton (12 pcs)', 'Chinese Samosa (12 pcs)', 'Chicken Donuts (12 pcs)']
                    },
                    {
                      id: 'deal-prem-3',
                      title: 'Hyderi Premium Deal 3',
                      titleUrdu: 'حیدری پریمیم ڈیل ۳',
                      price: 2800,
                      pcs: '66 pcs Royal Party Pack',
                      image: '/images/premium_deal_3_poster.jpg',
                      items: ['Malai Boti Roll (12 pcs)', 'Qeema Samosa (12 pcs)', 'Seekh Kabab (12 pcs)', 'Chicken Burger Patty (6 pcs)', 'Chinese Roll (12 pcs)', 'Nuggets (12 pcs)']
                    },
                    {
                      id: 'deal-prem-4',
                      title: 'Hyderi Premium Deal 4',
                      titleUrdu: 'حیدری پریمیم ڈیل ۴',
                      price: 3100,
                      pcs: '78 pcs Bumper Feast',
                      image: '/images/premium_deal_4_poster.jpg',
                      items: ['Chinese Roll (12 pcs)', 'Aloo Samosa (12 pcs)', 'Cheese Cone (6 pcs)', 'Wonton (12 pcs)', 'Small Nuggets (12 pcs)', 'Chicken Lolli Pop (6 pcs)', 'Mayo Garlic Roll (12 pcs)', 'Crispy Samosa (12 pcs)']
                    },
                    {
                      id: 'deal-prem-5',
                      title: 'Hyderi Premium Deal 5',
                      titleUrdu: 'حیدری پریمیم ڈیل ۵',
                      price: 2650,
                      pcs: '54 pcs Chef Special',
                      image: '/images/premium_deal_5_poster.jpg',
                      items: ['Malai Boti Samosa (12 pcs)', 'Crispy Roll (12 pcs)', 'Chicken Chowmein (12 pcs)', 'Bread Roll (12 pcs)', 'Chicken Steak (6 pcs)']
                    }
                  ].map(d => {
                    const pObj = products.find(p => p.id === d.id) || { id: d.id, name: d.title, price: d.price, image: d.image, isDeal: true };
                    return (
                      <div key={d.id} className="bg-emeraldBrand-900/90 rounded-3xl border-2 border-goldBrand-400/60 hover:border-goldBrand-300 shadow-xl overflow-hidden flex flex-col justify-between transition-all duration-300 hover:-translate-y-1.5 group">
                        
                        {/* Poster Image */}
                        <div
                          onClick={() => { setSelectedProduct(pObj); setShowMoreDealsModal(false); }}
                          className="relative aspect-[3/4] w-full cursor-pointer overflow-hidden bg-black/50"
                        >
                          <img
                            src={d.image}
                            alt={d.title}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                          />
                          <div className="absolute top-3 left-3 bg-emeraldBrand-950 text-goldBrand-300 text-xs font-black px-3 py-1.5 rounded-xl border border-goldBrand-400 shadow">
                            ⭐ PREMIUM DEAL
                          </div>
                          <div className="absolute top-3 right-3 bg-amber-500 text-emeraldBrand-950 text-xs font-black px-3 py-1.5 rounded-xl border border-goldBrand-300 shadow flex items-center gap-1">
                            <span>🛵</span>
                            <span>FREE Delivery</span>
                          </div>
                        </div>

                        {/* Details */}
                        <div className="p-4 sm:p-5 flex-1 flex flex-col justify-between space-y-4">
                          <div>
                            <div className="flex items-center justify-between gap-2 mb-2">
                              <h3 className="font-extrabold text-base sm:text-lg text-goldBrand-200 font-serifBrand">
                                {isUrdu ? d.titleUrdu : d.title}
                              </h3>
                              <span className="bg-goldBrand-500/20 text-goldBrand-300 text-xs font-black px-2.5 py-0.5 rounded-full border border-goldBrand-400/40 shrink-0">
                                {d.pcs}
                              </span>
                            </div>

                            <ul className="space-y-1 text-xs text-emeraldBrand-100/90 mb-4 bg-emeraldBrand-950/60 p-3 rounded-2xl border border-goldBrand-500/20">
                              {d.items.map((it, idx) => (
                                <li key={idx} className="flex items-center gap-1.5">
                                  <span className="text-goldBrand-400 font-bold">✓</span>
                                  <span>{it}</span>
                                </li>
                              ))}
                            </ul>
                          </div>

                          <div className="pt-3 border-t border-goldBrand-500/20 flex items-center justify-between gap-3">
                            <div>
                              <p className="text-[10px] uppercase text-emeraldBrand-200 font-bold">Combo Price</p>
                              <p className="text-xl sm:text-2xl font-black text-goldBrand-300">Rs. {d.price.toLocaleString()}/-</p>
                            </div>
                            <button
                              onClick={() => {
                                addToCart(pObj);
                                setShowMoreDealsModal(false);
                                setIsCartOpen(true);
                              }}
                              className="bg-goldBrand-500 hover:bg-goldBrand-400 text-emeraldBrand-950 px-4 py-2.5 rounded-xl font-black text-xs shadow-lg transition-all hover:scale-105 active:scale-95 flex items-center gap-1.5 cursor-pointer"
                            >
                              <span>🛒</span>
                              <span>{isUrdu ? 'بیگ میں شامل کریں' : 'Add to Bag'}</span>
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

              </div>
            </div>
          )}

          ` + modalTarget;

if (!content.includes(modalTarget)) {
  console.error('Modal target not found');
  process.exit(1);
}
content = content.replace(modalTarget, modalReplacement);

fs.writeFileSync('./scripts/build_luxury_theme.js', content, 'utf8');
console.log('SUCCESS: Added See More Deals modal to build_luxury_theme.js!');
