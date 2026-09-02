import fs from 'fs';
import { execSync } from 'child_process';

// Revert first to clean state
execSync('C:\\Users\\CBM\\mingit\\cmd\\git.exe checkout scripts/build_luxury_theme.js');

let content = fs.readFileSync('./scripts/build_luxury_theme.js', 'utf8');

// 1. CATEGORIES
content = content.replace(
  `{ id: 'all', label: 'All Menu', labelUrdu: 'تمام مینو (۵۴ آئٹمز)', icon: '✨' },`,
  `{ id: 'all', label: 'All Menu', labelUrdu: 'تمام مینو (۵۷ آئٹمز)', icon: '✨' },\n      { id: 'deals', label: 'SUPER DEALS', labelUrdu: 'بچت ڈیلز (۳ اسپیشل آفرز)', icon: '🔥' },`
);

// 2. Sections array in 'all' view
content = content.replace(
  `{[
                  { id: 'samosa', title: 'SAMOSA', titleUrdu: 'سموسے (۱۳ آئٹمز)', count: '13 Items', icon: '🥟' },`,
  `{[
                  { id: 'deals', title: '🔥 EXCLUSIVE SUPER SAVER DEALS', titleUrdu: '🔥 اسپیشل بچت ڈیلز (فری ڈیلیوری آفرز)', count: '03 Deals', icon: '🔥' },
                  { id: 'samosa', title: 'SAMOSA', titleUrdu: 'سموسے (۱۳ آئٹمز)', count: '13 Items', icon: '🥟' },`
);

// 3. ProductCard component aspect & dealItems
const oldCardPhoto = `          {/* Card Top Food Photo */}
          <div className="relative aspect-[4/3] w-full overflow-hidden bg-parchment-200">
            <img
              src={product.image}
              alt={title}
              className="w-full h-full object-cover group-hover:scale-108 transition-transform duration-500"
              loading="lazy"
            />
            {product.badge && (
              <div className="absolute top-2.5 left-2.5 bg-emeraldBrand-950 text-goldBrand-300 text-[10px] font-black px-2.5 py-1 rounded-lg border border-goldBrand-400/60 shadow uppercase tracking-wider">
                {isUrdu ? (product.badgeUrdu || product.badge) : product.badge}
              </div>
            )}
            <div className="absolute top-2.5 right-2.5 bg-black/75 backdrop-blur-xs text-goldBrand-200 text-[10px] font-black px-2 py-0.5 rounded-lg border border-goldBrand-400/40">
              {pack}
            </div>
          </div>`;

const newCardPhoto = `          {/* Card Top Food Photo */}
          <div className={"relative " + (isDeal ? "aspect-[3/4]" : "aspect-[4/3]") + " w-full overflow-hidden bg-parchment-200"}>
            <img
              src={product.image}
              alt={title}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
              loading="lazy"
            />
            {product.badge && (
              <div className="absolute top-2.5 left-2.5 bg-emeraldBrand-950 text-goldBrand-300 text-[10px] font-black px-2.5 py-1 rounded-lg border border-goldBrand-400/60 shadow uppercase tracking-wider">
                {isUrdu ? (product.badgeUrdu || product.badge) : product.badge}
              </div>
            )}
            <div className="absolute top-2.5 right-2.5 bg-black/80 backdrop-blur-xs text-goldBrand-200 text-[10px] font-black px-2 py-0.5 rounded-lg border border-goldBrand-400/40">
              {isDeal ? (isUrdu ? 'فری ڈیلیوری 🛵' : 'FREE Delivery 🛵') : pack}
            </div>
          </div>`;

content = content.replace('const pack = isUrdu ? (product.packQuantityUrdu || product.packQuantity) : product.packQuantity;', 'const pack = isUrdu ? (product.packQuantityUrdu || product.packQuantity) : product.packQuantity;\n      const isDeal = product.isDeal || product.category === "deals";');
content = content.replace(
  'className="group bg-white rounded-3xl border-2 border-goldBrand-400/40 hover:border-goldBrand-500 shadow-sm hover:shadow-xl transition-all duration-300 flex flex-col overflow-hidden cursor-pointer hover:-translate-y-1"',
  'className={"group bg-white rounded-3xl border-2 " + (isDeal ? "border-goldBrand-500 ring-2 ring-goldBrand-400/30" : "border-goldBrand-400/40 hover:border-goldBrand-500") + " shadow-sm hover:shadow-xl transition-all duration-300 flex flex-col overflow-hidden cursor-pointer hover:-translate-y-1"}'
);

content = content.replace(oldCardPhoto, newCardPhoto);

// 4. Insert deal items in card body
const oldDescriptionText = `              <p className="text-gray-500 text-[11px] font-urdu line-clamp-1 mt-0.5">
                {product.nameUrdu}
              </p>
            </div>`;

const newDescriptionText = `              <p className="text-gray-500 text-[11px] font-urdu line-clamp-1 mt-0.5">
                {product.nameUrdu}
              </p>
            </div>

            {product.dealItems && (
              <div className="bg-parchment-100 p-2 rounded-xl border border-goldBrand-400/30 text-[10px] text-gray-700 space-y-0.5">
                {product.dealItems.slice(0, 3).map((item, i) => (
                  <div key={i} className="truncate text-emeraldBrand-950 font-medium">
                    ★ {item}
                  </div>
                ))}
                {product.dealItems.length > 3 && (
                  <div className="text-[9px] text-amber-800 font-bold">
                    +{product.dealItems.length - 3} {isUrdu ? 'مزید آئٹمز...' : 'more items...'}
                  </div>
                )}
              </div>
            )}`;

content = content.replace(oldDescriptionText, newDescriptionText);

// 5. ProductDetailModal deal view
const oldModalImage = `              <div className="relative aspect-[16/10] w-full bg-parchment-200">
                <img src={product.image} alt={product.name} className="w-full h-full object-cover" />`;

const newModalImage = `              <div className={"relative " + (product.isDeal ? "aspect-[3/4]" : "aspect-[16/10]") + " w-full bg-parchment-200"}>
                <img src={product.image} alt={product.name} className="w-full h-full object-contain bg-black/90" />`;

content = content.replace(oldModalImage, newModalImage);

const oldModalDescBlock = `                <p className="text-xs text-gray-600 leading-relaxed">
                  {isUrdu ? (product.descriptionUrdu || product.description) : product.description}
                </p>`;

const newModalDescBlock = `                {product.dealItems && (
                  <div className="bg-emeraldBrand-950 text-white p-4 rounded-2xl border-2 border-goldBrand-400 space-y-2">
                    <h4 className="font-extrabold text-xs text-goldBrand-300 uppercase tracking-wider flex items-center gap-2">
                      <span>🎁</span>
                      <span>{isUrdu ? 'ڈیل میں شامل تمام ۵ آئٹمز:' : 'Items Included in Deal:'}</span>
                    </h4>
                    <ul className="space-y-1.5 text-xs text-goldBrand-100 font-medium">
                      {product.dealItems.map((item, idx) => (
                        <li key={idx} className="flex items-center gap-2">
                          <span className="text-goldBrand-400 font-bold">★</span>
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                <p className="text-xs text-gray-600 leading-relaxed">
                  {isUrdu ? (product.descriptionUrdu || product.description) : product.description}
                </p>`;

content = content.replace(oldModalDescBlock, newModalDescBlock);

fs.writeFileSync('./scripts/build_luxury_theme.js', content, 'utf8');
console.log('SUCCESS: build_luxury_theme.js patched without any backticks!');
