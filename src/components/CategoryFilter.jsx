import React from 'react';

export const CATEGORIES = [
  { id: 'all', label: 'All Items', icon: '✨', count: 56 },
  { id: 'samosa', label: 'Samosas', icon: '🥟', count: 13 },
  { id: 'roll', label: 'Spring Rolls', icon: '🌯', count: 12 },
  { id: 'kabab', label: 'Kababs & Momos', icon: '🍢', count: 11 },
  { id: 'pizza', label: 'Mini Pizzas', icon: '🍕', count: 2 },
  { id: 'special', label: 'Specialties & Bites', icon: '🍗', count: 11 },
  { id: 'patti', label: 'Patti & Parathas', icon: '🫓', count: 4 },
  { id: 'nimco', label: 'Hyderi Nimco', icon: '🥜', count: 3 }
];

export default function CategoryFilter({ activeCategory, onSelectCategory, products }) {
  // Compute counts dynamically if products array is passed
  const getCount = (catId) => {
    if (!products || products.length === 0) return '';
    if (catId === 'all') return products.length;
    return products.filter(p => p.category === catId).length;
  };

  return (
    <div className="sticky top-[73px] z-30 bg-white/95 backdrop-blur-md border-b border-gray-100 py-3 shadow-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-1">
          {CATEGORIES.map((cat) => {
            const isActive = activeCategory === cat.id;
            const count = getCount(cat.id);

            return (
              <button
                key={cat.id}
                onClick={() => onSelectCategory(cat.id)}
                className={`flex items-center gap-2 px-4 py-2 rounded-full text-xs sm:text-sm font-bold whitespace-nowrap transition-all duration-200 shrink-0 ${
                  isActive
                    ? 'bg-red-800 text-white shadow-md shadow-red-900/20 scale-[1.02] ring-2 ring-amber-400/50'
                    : 'bg-amber-50/70 text-gray-700 hover:bg-amber-100/80 hover:text-red-900 border border-amber-200/60'
                }`}
              >
                <span>{cat.icon}</span>
                <span>{cat.label}</span>
                {count > 0 && (
                  <span
                    className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold ${
                      isActive
                        ? 'bg-amber-400 text-red-950'
                        : 'bg-white text-gray-600 border border-gray-200'
                    }`}
                  >
                    {count}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
