import fs from 'fs';

let content = fs.readFileSync('./scripts/build_luxury_theme.js', 'utf8');

// 1. Remove old standalone category nav at line 901
const oldCategoryNavTarget = `            {/* Category Navigation Pills */}
            <div className="sticky top-[105px] z-30 bg-[#FAF5E8]/95 backdrop-blur-md py-3 -mx-4 px-4 sm:mx-0 sm:px-0 mb-6 border-y border-goldBrand-400/30">
              <div className="flex gap-2 overflow-x-auto no-scrollbar py-0.5">
                {CATEGORIES.map(cat => (
                  <button
                    key={cat.id}
                    onClick={() => {
                      setActiveCategory(cat.id);
                      setSearchQuery('');
                    }}
                    className={\`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-bold whitespace-nowrap transition-all duration-200 border \${
                      activeCategory === cat.id && !searchQuery
                        ? 'bg-emeraldBrand-900 text-goldBrand-300 border-goldBrand-500 shadow-md scale-105 font-black'
                        : 'bg-white text-emeraldBrand-950 border-goldBrand-300/60 hover:bg-parchment-100 hover:border-goldBrand-500'
                    }\`}
                  >
                    <span>{cat.icon}</span>
                    <span>{isUrdu ? cat.labelUrdu : cat.label}</span>
                  </button>
                ))}
              </div>
            </div>`;

if (content.includes(oldCategoryNavTarget)) {
  content = content.replace(oldCategoryNavTarget, '');
  console.log('Removed old standalone category nav');
} else {
  console.error('Old category nav target not found');
}

// 2. Add integrated Category Navigation Bar inside <header>
const headerEndTarget = `              </div>
            </div>
          </header>`;

const headerEndReplacement = `              </div>
            </div>

            {/* Integrated Category Navigation Bar */}
            <div className="bg-gradient-to-r from-emeraldBrand-950 via-emeraldBrand-900 to-emeraldBrand-950 py-2 px-4 sm:px-6 lg:px-8 border-t border-goldBrand-500/30">
              <div className="max-w-7xl mx-auto flex items-center gap-2 overflow-x-auto no-scrollbar py-0.5">
                {CATEGORIES.map(cat => (
                  <button
                    key={cat.id}
                    onClick={() => {
                      setActiveCategory(cat.id);
                      setSearchQuery('');
                      document.getElementById('menu-view')?.scrollIntoView({ behavior: 'smooth' });
                    }}
                    className={\`flex items-center gap-2 px-3.5 sm:px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all duration-200 border cursor-pointer \${
                      activeCategory === cat.id && !searchQuery
                        ? 'bg-goldBrand-500 text-emeraldBrand-950 border-goldBrand-300 shadow-md font-black scale-105'
                        : 'bg-emeraldBrand-900/90 text-goldBrand-200 border-goldBrand-500/30 hover:bg-emeraldBrand-800 hover:text-white hover:border-goldBrand-400'
                    }\`}
                  >
                    <span>{cat.icon}</span>
                    <span>{isUrdu ? cat.labelUrdu : cat.label}</span>
                  </button>
                ))}
              </div>
            </div>
          </header>`;

if (content.includes(headerEndTarget)) {
  content = content.replace(headerEndTarget, headerEndReplacement);
  console.log('Added integrated category nav inside header');
} else {
  console.error('Header end target not found');
}

fs.writeFileSync('./scripts/build_luxury_theme.js', content, 'utf8');
console.log('SUCCESS: Patched responsive header!');
