import fs from 'fs';

let content = fs.readFileSync('./scripts/build_luxury_theme.js', 'utf8');

const targetStr = `              <div className="flex gap-2 overflow-x-auto no-scrollbar py-0.5">
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

const idx = content.indexOf('{CATEGORIES.map(cat => (');
const lastIdx = content.indexOf('{CATEGORIES.map(cat => (', idx + 1);

if (lastIdx > 0) {
  // Find the parent div start and end around lastIdx
  const divStart = content.lastIndexOf('<div className="flex gap-2', lastIdx);
  const divEnd = content.indexOf('</div>\n            </div>', lastIdx) + '</div>\n            </div>'.length;
  
  if (divStart > 0 && divEnd > divStart) {
    const snippetToReplace = content.substring(divStart, divEnd);
    content = content.replace(snippetToReplace, '');
    console.log('SUCCESS: Removed second CATEGORIES map block!');
    fs.writeFileSync('./scripts/build_luxury_theme.js', content, 'utf8');
  } else {
    console.error('Could not determine bounds:', divStart, divEnd);
  }
} else {
  console.error('Second CATEGORIES.map not found!');
}
