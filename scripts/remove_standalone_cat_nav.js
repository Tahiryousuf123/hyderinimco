import fs from 'fs';

let content = fs.readFileSync('./scripts/build_luxury_theme.js', 'utf8');

const targetStr = `            {/* Category Navigation Pills */}
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

if (content.includes(targetStr)) {
  content = content.replace(targetStr, '');
  console.log('SUCCESS: Removed standalone category pills!');
  fs.writeFileSync('./scripts/build_luxury_theme.js', content, 'utf8');
} else {
  console.error('ERROR: targetStr not found');
}
