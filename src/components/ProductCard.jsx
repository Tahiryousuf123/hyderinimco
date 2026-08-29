import React, { useState } from 'react';
import { Plus, Check, Star, Info, Flame } from 'lucide-react';

export default function ProductCard({ product, onAddToCart, onOpenDetail }) {
  const [isAdded, setIsAdded] = useState(false);
  const [imgError, setImgError] = useState(false);

  const handleAdd = (e) => {
    e.stopPropagation();
    onAddToCart(product);
    setIsAdded(true);
    setTimeout(() => setIsAdded(false), 1200);
  };

  const defaultImg = 'https://images.unsplash.com/photo-1601050690597-df0568f70950?auto=format&fit=crop&w=600&q=80';

  return (
    <div
      onClick={() => onOpenDetail(product)}
      className="group relative bg-white rounded-2xl border border-gray-100/80 shadow-sm hover:shadow-xl transition-all duration-300 flex flex-col overflow-hidden cursor-pointer hover:-translate-y-1"
    >
      {/* Image Container */}
      <div className="relative aspect-[4/3] w-full overflow-hidden bg-amber-50">
        <img
          src={imgError || !product.image ? defaultImg : product.image}
          alt={product.name}
          onError={() => setImgError(true)}
          className="w-full h-full object-cover group-hover:scale-108 transition-transform duration-500"
          loading="lazy"
        />

        {/* Top Badges */}
        <div className="absolute top-2.5 left-2.5 flex flex-col gap-1.5 items-start">
          {product.badge && (
            <span className="bg-red-800 text-white text-[10px] font-black px-2.5 py-1 rounded-md shadow-md uppercase tracking-wider">
              {product.badge}
            </span>
          )}
          {product.featured && !product.badge && (
            <span className="bg-amber-500 text-red-950 text-[10px] font-black px-2 py-0.5 rounded-md shadow-md uppercase tracking-wider flex items-center gap-1">
              <Flame className="w-3 h-3" /> Special
            </span>
          )}
        </div>

        {/* Pack Quantity Badge */}
        <div className="absolute top-2.5 right-2.5 bg-black/75 backdrop-blur-md text-amber-300 font-extrabold text-xs px-2.5 py-1 rounded-lg border border-white/20 shadow-sm">
          {product.packQuantity}
        </div>

        {/* Availability Badge if out of stock */}
        {!product.isAvailable && (
          <div className="absolute inset-0 bg-gray-900/70 backdrop-blur-xs flex items-center justify-center">
            <span className="bg-red-600 text-white font-bold text-xs uppercase px-3 py-1.5 rounded-lg shadow-lg">
              Sold Out Today
            </span>
          </div>
        )}
      </div>

      {/* Product Content Details */}
      <div className="p-4 sm:p-5 flex flex-col flex-1 justify-between">
        <div>
          {/* Category Subtitle & Rating */}
          <div className="flex items-center justify-between gap-2 text-xs mb-1.5">
            <span className="text-red-700 font-semibold text-[11px] uppercase tracking-wider">
              {product.categoryLabel || product.category}
            </span>
            <div className="flex items-center gap-1 text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded text-[11px] font-bold">
              <Star className="w-3 h-3 fill-amber-500 text-amber-500" />
              <span>{product.rating || 4.9}</span>
              <span className="text-gray-400 font-normal">({product.reviewCount || 40})</span>
            </div>
          </div>

          {/* Product Name */}
          <h3 className="font-bold text-gray-900 text-base sm:text-lg leading-snug group-hover:text-red-800 transition-colors line-clamp-1">
            {product.name}
          </h3>

          {/* Description */}
          <p className="text-xs text-gray-500 mt-1 line-clamp-2 leading-relaxed">
            {product.description || 'Authentic handcrafted recipe, freshly prepared and frozen for premium crispiness.'}
          </p>
        </div>

        {/* Pricing & Add to Cart Action */}
        <div className="mt-4 pt-3 border-t border-gray-100 flex items-center justify-between gap-2">
          <div>
            <span className="text-[10px] text-gray-400 font-medium block">Price / Pack</span>
            <div className="flex items-baseline gap-1">
              <span className="text-xs font-bold text-red-800">Rs.</span>
              <span className="text-lg sm:text-xl font-extrabold text-gray-900">
                {product.price}
              </span>
              <span className="text-[10px] text-gray-500">/-</span>
            </div>
          </div>

          {/* Add Button */}
          <button
            onClick={handleAdd}
            disabled={!product.isAvailable}
            className={`flex items-center justify-center gap-1.5 px-3.5 sm:px-4 py-2 rounded-xl text-xs font-bold transition-all duration-200 shadow-sm ${
              !product.isAvailable
                ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                : isAdded
                ? 'bg-emerald-600 text-white scale-95'
                : 'bg-red-800 hover:bg-red-900 text-white hover:scale-105 active:scale-95 shadow-red-900/20'
            }`}
          >
            {isAdded ? (
              <>
                <Check className="w-4 h-4" />
                <span>Added</span>
              </>
            ) : (
              <>
                <Plus className="w-4 h-4 text-amber-300" />
                <span>Add</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
