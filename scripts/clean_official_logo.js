import fs from 'fs';

const logoPath = 'C:\\Users\\CBM\\.gemini\\antigravity\\brain\\f937e2b2-114f-4bbd-ae75-917c6552a711\\.user_uploaded\\media__1788336868832.jpg';

// Copy the exact chef hat & mustache logo image to public/
fs.copyFileSync(logoPath, './public/images/hyderi_official_logo.png');
fs.copyFileSync(logoPath, './public/images/hyderi_official_logo.jpg');
fs.copyFileSync(logoPath, './public/favicon.png');
fs.copyFileSync(logoPath, './public/favicon.ico');

let content = fs.readFileSync('./scripts/build_luxury_theme.js', 'utf8');

// Replace HyderiLogoEmblem with clean image tag using relative & absolute fallback paths
const emblemCode = `    // Official Hyderi Badge Logo Emblem Component
    function HyderiLogoEmblem({ size = "normal" }) {
      const isLarge = size === "large";
      const isHero = size === "hero";
      let dims = "w-11 h-11 border-2";
      if (isLarge) dims = "w-14 h-14 sm:w-16 sm:h-16 border-2";
      if (isHero) dims = "w-28 h-28 sm:w-36 sm:h-36 border-4 shadow-2xl";

      return (
        <div className={\`relative flex items-center justify-center rounded-full bg-[#FAF5E8] border-goldBrand-400/90 shadow-xl overflow-hidden shrink-0 \${dims}\`}>
          <img
            src="images/hyderi_official_logo.png"
            onError={(e) => {
              if (e.target.src.includes('images/hyderi_official_logo.png')) {
                e.target.src = '/images/hyderi_official_logo.png';
              }
            }}
            alt="Hyderi Nimco & Frozen Official Logo"
            className="w-full h-full object-cover rounded-full"
          />
        </div>
      );
    }`;

// Replace lines starting from 'Official Hyderi' up to 'function App()'
const lines = content.split('\n');
let startIdx = -1;
let endIdx = -1;

for (let i = 0; i < lines.length; i++) {
  if (lines[i].includes('Official Hyderi') && lines[i].includes('Emblem Component')) {
    startIdx = i;
    for (let j = i; j < i + 35; j++) {
      if (lines[j].includes('function App()')) {
        endIdx = j;
        break;
      }
    }
    break;
  }
}

if (startIdx >= 0 && endIdx > startIdx) {
  lines.splice(startIdx, endIdx - startIdx, emblemCode);
  content = lines.join('\n');
  fs.writeFileSync('./scripts/build_luxury_theme.js', content, 'utf8');
  console.log('SUCCESS: Cleanly replaced HyderiLogoEmblem in build_luxury_theme.js!');
} else {
  console.error('Could not find startIdx/endIdx:', startIdx, endIdx);
}
