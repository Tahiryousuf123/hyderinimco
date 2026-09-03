import fs from 'fs';

let content = fs.readFileSync('./scripts/build_luxury_theme.js', 'utf8');

// 1. Update Favicon in head
const oldFavicon = `  <!-- Favicon (Royal Hyderi 1970 Gold Emblem) -->
  <link rel="icon" type="image/svg+xml" href="/favicon.svg" />
  <link rel="alternate icon" type="image/svg+xml" href="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><circle cx='50' cy='50' r='46' fill='%23022c22' stroke='%23d97706' stroke-width='4'/><circle cx='50' cy='50' r='40' fill='none' stroke='%23f59e0b' stroke-width='1.5'/><path d='M 30 32 L 35 22 L 50 30 L 65 22 L 70 32 Z' fill='%23f59e0b'/><text x='50' y='58' font-family='Georgia, serif' font-size='44' font-weight='900' fill='%23fcd34d' text-anchor='middle'>H</text><text x='50' y='82' font-family='Arial, sans-serif' font-size='11' font-weight='900' fill='%23fbbf24' text-anchor='middle'>1970</text></svg>" />`;

const newFavicon = `  <!-- Favicon (Official Hyderi Badge Logo) -->
  <link rel="icon" type="image/png" href="/favicon.png" />
  <link rel="apple-touch-icon" href="/favicon.png" />`;

if (content.includes(oldFavicon)) {
  content = content.replace(oldFavicon, newFavicon);
  console.log('SUCCESS: Updated Favicon link');
} else {
  console.error('ERROR: oldFavicon not found');
}

// 2. Update HyderiLogoEmblem component
const oldLogoComp = `    function HyderiLogoEmblem({ size = "normal" }) {
      const isLarge = size === "large";
      return (
        <div className={\`relative flex items-center justify-center rounded-full bg-gradient-to-br from-emeraldBrand-900 to-emeraldBrand-950 border-2 border-goldBrand-400/80 shadow-lg shrink-0 \${isLarge ? 'w-16 h-16' : 'w-11 h-11'}\`}>
          <div className="text-center flex flex-col items-center justify-center">
            <span className={isLarge ? 'text-2xl leading-none' : 'text-lg leading-none'}>👨‍🍳</span>
            <span className="text-[7px] font-black text-goldBrand-300 tracking-tighter leading-none mt-0.5">1970</span>
          </div>
        </div>
      );
    }`;

const newLogoComp = `    function HyderiLogoEmblem({ size = "normal" }) {
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

if (content.includes(oldLogoComp)) {
  content = content.replace(oldLogoComp, newLogoComp);
  console.log('SUCCESS: Updated HyderiLogoEmblem component');
} else {
  console.error('ERROR: oldLogoComp not found');
}

// 3. Update Hero Signboard logo call
content = content.replace(
  `<HyderiLogoEmblem size="large" />`,
  `<HyderiLogoEmblem size="hero" />`
);

fs.writeFileSync('./scripts/build_luxury_theme.js', content, 'utf8');
console.log('SUCCESS: Patched build_luxury_theme.js with official logo!');
