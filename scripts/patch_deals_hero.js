import fs from 'fs';

let content = fs.readFileSync('./scripts/build_luxury_theme.js', 'utf8');

const heroDealsBlock = `            {/* Dedicated Super Saver Deals Showcase Hero Section */}
            <section className="mb-12 bg-gradient-to-br from-emeraldBrand-950 via-emeraldBrand-900 to-emeraldBrand-950 rounded-3xl p-5 sm:p-8 border-2 border-goldBrand-400 shadow-2xl relative overflow-hidden">
              {/* Decorative Metallic Background Elements */}
              <div className="absolute top-0 right-0 w-96 h-96 bg-goldBrand-500/10 rounded-full blur-3xl pointer-events-none"></div>
              <div className="absolute bottom-0 left-0 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none"></div>

              {/* Header Ribbon */}
              <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8 border-b border-goldBrand-400/30 pb-5">
                <div className="space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="bg-gradient-to-r from-amber-500 to-red-500 text-white text-[10px] sm:text-xs font-black px-3 py-1 rounded-full uppercase tracking-widest shadow animate-pulse">
                      {isUrdu ? '🔥 محدود وقت کی آفر' : '🔥 LIMITED TIME MEGA SAVER'}
                    </span>
                    <span className="bg-goldBrand-500/20 text-goldBrand-300 text-[10px] sm:text-xs font-extrabold px-2.5 py-1 rounded-full border border-goldBrand-400/40">
                      {isUrdu ? 'فری کولڈ باکس ڈیلیوری 🛵' : 'FREE COLD-BOX DELIVERY 🛵'}
                    </span>
                  </div>
                  <h2 className="text-2xl sm:text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-goldBrand-200 via-goldBrand-300 to-amber-200 font-serifBrand">
                    {isUrdu ? 'اسپیشل بچت کمبو ڈیلز' : 'SUPER SAVER COMBO DEALS'}
                  </h2>
                  <p className="text-xs sm:text-sm text-goldBrand-100/90 font-medium max-w-2xl">
                    {isUrdu ? 'پورے کراچی میں ایکسپریس ہوم ڈیلیوری۔ ۵ آئٹمز کا زبردست کمبو پیک بہترین قیمت میں!' : 'Get up to 96 pcs of premium frozen rolls, samosas & snacks bundled together with 100% Free Express Delivery across Karachi!'}
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      setActiveCategory('deals');
                      document.getElementById('menu-view')?.scrollIntoView({ behavior: 'smooth' });
                    }}
                    className="bg-goldBrand-500 hover:bg-goldBrand-400 text-emeraldBrand-950 px-5 py-3 rounded-2xl font-black text-xs sm:text-sm shadow-xl transition-all hover:scale-105 active:scale-95 border border-goldBrand-300 flex items-center gap-2"
                  >
                    <span>⚡</span>
                    <span>{isUrdu ? 'تمام ڈیلز دیکھیں' : 'Explore All Deals'}</span>
                  </button>
                </div>
              </div>

              {/* 3 Showcase Deal Cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 relative z-10">
                {[
                  {
                    id: 'deal-1',
                    title: 'Deal 1 - Jumbo Combo',
                    titleUrdu: 'ڈیل ۱ - جمبو کمبو',
                    price: 2200,
                    pcs: '82 pcs',
                    image: '/images/deal_1_poster.jpg',
                    badge: 'JUMBO SAVER',
                    badgeUrdu: 'جمبو سیور',
                    items: [
                      'Chicken Cheese Lollipop Pop (6 pcs)',
                      'Nuggets (12 pcs)',
                      'Chicken Popcorn (30 pcs)',
                      'Chicken Finger (10 pcs)',
                      'Cheese One Bite Roll (24 pcs)'
                    ]
                  },
                  {
                    id: 'deal-2',
                    title: 'Deal 2 - Family Feast',
                    titleUrdu: 'ڈیل ۲ - فیملی فیسٹ',
                    price: 2500,
                    pcs: '96 pcs',
                    image: '/images/deal_2_poster.jpg',
                    badge: 'MOST POPULAR',
                    badgeUrdu: 'سب سے مقبول',
                    items: [
                      'Chimmy Changa (6 pcs)',
                      'Nuggets (24 pcs)',
                      'Chicken Popcorn (30 pcs)',
                      'Chicken BBQ Roll (12 pcs)',
                      'Chicken One Bite Samosa (24 pcs)'
                    ]
                  },
                  {
                    id: 'deal-3',
                    title: 'Deal 3 - Party Special',
                    titleUrdu: 'ڈیل ۳ - پارٹی اسپیشل',
                    price: 2400,
                    pcs: '66 pcs',
                    image: '/images/deal_3_poster.jpg',
                    badge: 'DAWAT FAVORITE',
                    badgeUrdu: 'دعوت فیورٹ',
                    items: [
                      'Chicken Cheese Cone (6 pcs)',
                      'BBQ Samosa (12 pcs)',
                      'Chinese Roll (12 pcs)',
                      'Malai Boti One Bite Roll (24 pcs)',
                      'Burger Patty (6 pcs)'
                    ]
                  }
                ].map(d => {
                  const pObj = products.find(p => p.id === d.id) || { id: d.id, name: d.title, price: d.price, image: d.image, isDeal: true };
                  return (
                    <div key={d.id} className="bg-emeraldBrand-900/90 rounded-3xl border-2 border-goldBrand-400/60 hover:border-goldBrand-300 shadow-xl overflow-hidden flex flex-col justify-between transition-all duration-300 hover:-translate-y-1.5 group">
                      
                      {/* Card Image */}
                      <div
                        onClick={() => setSelectedProduct(pObj)}
                        className="relative aspect-[3/4] w-full cursor-pointer overflow-hidden bg-black/50"
                      >
                        <img
                          src={d.image}
                          alt={d.title}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                        />
                        <div className="absolute top-3 left-3 bg-emeraldBrand-950 text-goldBrand-300 text-xs font-black px-3 py-1.5 rounded-xl border border-goldBrand-400 shadow">
                          {isUrdu ? d.badgeUrdu : d.badge}
                        </div>
                        <div className="absolute top-3 right-3 bg-amber-500 text-emeraldBrand-950 text-xs font-black px-3 py-1.5 rounded-xl border border-goldBrand-300 shadow flex items-center gap-1">
                          <span>🛵</span>
                          <span>{isUrdu ? 'فری ڈیلیوری' : 'FREE Delivery'}</span>
                        </div>
                      </div>

                      {/* Card Body */}
                      <div className="p-4 sm:p-5 flex-1 flex flex-col justify-between space-y-4">
                        <div>
                          <div className="flex items-center justify-between">
                            <h3 className="text-lg font-black text-goldBrand-200 font-serifBrand">
                              {isUrdu ? d.titleUrdu : d.title}
                            </h3>
                            <span className="text-xs font-extrabold bg-goldBrand-500/20 text-goldBrand-300 px-2.5 py-1 rounded-lg border border-goldBrand-400/30">
                              {d.pcs}
                            </span>
                          </div>

                          {/* Items List */}
                          <ul className="mt-3 space-y-1.5 text-xs text-goldBrand-100/90 bg-emeraldBrand-950/60 p-3 rounded-2xl border border-goldBrand-400/20">
                            {d.items.map((item, idx) => (
                              <li key={idx} className="flex items-center gap-2">
                                <span className="text-goldBrand-400 font-bold">★</span>
                                <span className="truncate">{item}</span>
                              </li>
                            ))}
                          </ul>
                        </div>

                        {/* Price & Action */}
                        <div className="flex items-center justify-between pt-3 border-t border-goldBrand-400/30">
                          <div>
                            <span className="text-[10px] text-goldBrand-300/80 block font-bold uppercase">{isUrdu ? 'ڈیل کی قیمت' : 'Deal Price'}</span>
                            <span className="text-xl sm:text-2xl font-black text-white font-mono">
                              Rs. {d.price}/-
                            </span>
                          </div>

                          <button
                            onClick={() => addToCart(pObj, 1)}
                            className="bg-gradient-to-r from-goldBrand-500 to-amber-400 hover:from-goldBrand-400 hover:to-amber-300 text-emeraldBrand-950 font-black px-4 py-2.5 rounded-xl text-xs sm:text-sm shadow-lg transition-all hover:scale-105 active:scale-95 border border-goldBrand-200 flex items-center gap-1.5"
                          >
                            <span>🛒</span>
                            <span>{isUrdu ? 'کارٹ میں شامل کریں' : 'Add to Bag'}</span>
                          </button>
                        </div>

                      </div>

                    </div>
                  );
                })}
              </div>
            </section>

`;

if (!content.includes('<main id="menu-view" className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full">')) {
  console.error('ERROR: main tag not found!');
  process.exit(1);
}

content = content.replace(
  '<main id="menu-view" className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full">',
  '<main id="menu-view" className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full">\n' + heroDealsBlock
);

fs.writeFileSync('./scripts/build_luxury_theme.js', content, 'utf8');
console.log('SUCCESS: Inserted Hero Deals Showcase into build_luxury_theme.js!');
