import fs from 'fs';

const srcImg = 'C:\\Users\\CBM\\.gemini\\antigravity\\brain\\f937e2b2-114f-4bbd-ae75-917c6552a711\\.user_uploaded\\media__1788321039174.png';
const imgBuffer = fs.readFileSync(srcImg);
const base64Data = imgBuffer.toString('base64');
const dataUrl = `data:image/png;base64,${base64Data}`;

console.log('Logo image buffer size:', imgBuffer.length, 'bytes');

// Also copy to public/
fs.copyFileSync(srcImg, './public/images/hyderi_official_logo.png');
fs.copyFileSync(srcImg, './public/favicon.png');
fs.copyFileSync(srcImg, './public/favicon.ico');

let content = fs.readFileSync('./scripts/build_luxury_theme.js', 'utf8');

// Replace HyderiLogoEmblem to use this exact base64 data URL as primary src and /images/hyderi_official_logo.png as fallback
const oldLogoCompTarget = `    // Official Hyderi Logo Emblem Component
    function HyderiLogoEmblem({ size = "normal" }) {
      const isLarge = size === "large";
      const isHero = size === "hero";
      let dims = "w-11 h-11 border-2";
      if (isLarge) dims = "w-16 h-16 border-2";
      if (isHero) dims = "w-28 h-28 sm:w-36 sm:h-36 border-4 shadow-2xl";

      return (
        <div className={\`relative flex items-center justify-center rounded-full bg-[#FAF5E8] border-goldBrand-400/90 shadow-xl overflow-hidden shrink-0 \${dims}\`}>
          <img src="/images/hyderi_official_logo.png" alt="Hyderi Nimco & Frozen Official Logo" className="w-full h-full object-cover rounded-full" />
        </div>
      );
    }`;

const newLogoCompReplacement = `    // Official Hyderi Badge Logo Emblem Component
    const HYDERI_OFFICIAL_LOGO_SRC = "${dataUrl}";

    function HyderiLogoEmblem({ size = "normal" }) {
      const isLarge = size === "large";
      const isHero = size === "hero";
      let dims = "w-11 h-11 border-2";
      if (isLarge) dims = "w-14 h-14 sm:w-16 sm:h-16 border-2";
      if (isHero) dims = "w-28 h-28 sm:w-36 sm:h-36 border-4 shadow-2xl";

      return (
        <div className={\`relative flex items-center justify-center rounded-full bg-[#FAF5E8] border-goldBrand-400/90 shadow-xl overflow-hidden shrink-0 \${dims}\`}>
          <img
            src={HYDERI_OFFICIAL_LOGO_SRC}
            onError={(e) => { e.target.src = 'images/hyderi_official_logo.png'; }}
            alt="Hyderi Nimco & Frozen Official Logo"
            className="w-full h-full object-cover rounded-full"
          />
        </div>
      );
    }`;

if (content.includes(oldLogoCompTarget)) {
  content = content.replace(oldLogoCompTarget, newLogoCompReplacement);
  console.log('SUCCESS: Replaced HyderiLogoEmblem with inline data URL!');
} else {
  console.error('ERROR: oldLogoCompTarget not found');
}

fs.writeFileSync('./scripts/build_luxury_theme.js', content, 'utf8');
