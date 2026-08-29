import React, { useState } from 'react';
import { X, Plus, Minus, ShoppingBag, Flame, Sparkles, ShieldCheck, Check } from 'lucide-react';

export default function ProductModal({ product, isOpen, onClose, onAddToCart }) {
  const [qty, setQty] = useState(1);
  const [isAdded, setIsAdded] = useState(false);

  if (!isOpen || !product) return null;

  const handleAdd = () => {
    onAddToCart(product, qty);
    setIsAdded(true);
    setTimeout(() => {
      setIsAdded(false);
      onClose();
    }, 900);
  };

  const getCookingInstructions = (cat) => {
    switch (cat) {
      case 'samosa':
      case 'roll':
        return 'Heat cooking oil on medium heat. Deep fry directly from freezer (without defrosting) for 4-5 minutes until golden brown and crispy.';
      case 'kabab':
        return 'Shallow fry on medium-low flame with 2-3 tbsp oil or egg wash coating for 3-4 minutes each side until heated through and golden.';
      case 'pizza':
        return 'Preheat oven to 180°C (350°F) or toaster oven. Bake for 6-8 minutes until cheese is completely melted and bubbly.';
      case 'patti':
        return 'Defrost sheets at room temperature for 15-20 mins under a damp cloth before rolling to prevent cracking.';
      default:
        return 'Deep fry or air fry at 180°C for 5-6 minutes until hot, golden, and crispy throughout.';
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="relative bg-white rounded-3xl max-w-lg w-full overflow-hidden shadow-2xl border border-amber-100 animate-in fade-in zoom-in-95 duration-200">
        
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-10 w-9 h-9 rounded-full bg-white/90 text-gray-700 hover:bg-red-50 hover:text-red-700 shadow-md flex items-center justify-center transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Modal Image */}
        <div className="relative aspect-video w-full bg-amber-50">
          <img
            src={product.image}
            alt={product.name}
            className="w-full h-full object-cover"
          />
          <div className="absolute bottom-3 left-3 bg-black/70 backdrop-blur-md px-3 py-1 rounded-xl text-amber-300 font-bold text-xs">
            {product.packQuantity}
          </div>
          {product.badge && (
            <div className="absolute top-3 left-3 bg-red-800 text-white font-extrabold text-xs px-3 py-1 rounded-lg uppercase tracking-wider shadow">
              {product.badge}
            </div>
          )}
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-4">
          <div>
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-bold text-red-700 uppercase tracking-wider">
                {product.categoryLabel}
              </span>
              <span className="text-xs text-gray-500 font-medium">
                Pack Size: <b className="text-gray-900">{product.packQuantity}</b>
              </span>
            </div>
            <h2 className="text-2xl font-black text-gray-900 mt-1">
              {product.name}
            </h2>
            <p className="text-sm text-gray-600 mt-2 leading-relaxed">
              {product.description || 'Authentic traditional recipe made with fresh, premium ingredients. Perfectly seasoned and frozen to seal in flavor.'}
            </p>
          </div>

          {/* Cooking / Preparation Guidance */}
          <div className="bg-amber-50/80 rounded-2xl p-3.5 border border-amber-200/70 text-xs">
            <div className="flex items-center gap-1.5 font-bold text-amber-900 mb-1">
              <Flame className="w-4 h-4 text-red-700" />
              <span>Recommended Cooking Method</span>
            </div>
            <p className="text-amber-950/80 leading-relaxed">
              {getCookingInstructions(product.category)}
            </p>
          </div>

          {/* Highlights */}
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="flex items-center gap-2 p-2 rounded-xl bg-gray-50 text-gray-700">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              <span>100% Halal Meats</span>
            </div>
            <div className="flex items-center gap-2 p-2 rounded-xl bg-gray-50 text-gray-700">
              <Sparkles className="w-4 h-4 text-amber-600" />
              <span>No Added Preservatives</span>
            </div>
          </div>

          {/* Price & Quantity Adjuster */}
          <div className="pt-3 border-t border-gray-100 flex items-center justify-between gap-4">
            <div>
              <span className="text-xs text-gray-500">Total Price</span>
              <div className="text-2xl font-extrabold text-red-800">
                Rs. {product.price * qty}/-
              </div>
            </div>

            {/* Quantity Selector */}
            <div className="flex items-center border border-gray-200 rounded-xl bg-gray-50 p-1">
              <button
                onClick={() => setQty(Math.max(1, qty - 1))}
                className="w-8 h-8 rounded-lg bg-white text-gray-700 hover:bg-amber-100 flex items-center justify-center shadow-xs"
              >
                <Minus className="w-3.5 h-3.5" />
              </button>
              <span className="w-10 text-center font-black text-sm text-gray-900">
                {qty}
              </span>
              <button
                onClick={() => setQty(qty + 1)}
                className="w-8 h-8 rounded-lg bg-white text-gray-700 hover:bg-amber-100 flex items-center justify-center shadow-xs"
              >
                <Plus className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Submit Add to Bag */}
          <button
            onClick={handleAdd}
            disabled={!product.isAvailable}
            className={`w-full py-3.5 rounded-2xl font-bold text-sm shadow-lg flex items-center justify-center gap-2 transition-all ${
              !product.isAvailable
                ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                : isAdded
                ? 'bg-emerald-600 text-white'
                : 'bg-gradient-to-r from-red-700 to-red-800 hover:from-red-800 hover:to-red-900 text-white shadow-red-900/20 active:scale-98'
            }`}
          >
            {isAdded ? (
              <>
                <Check className="w-5 h-5" />
                <span>Added to Bag!</span>
              </>
            ) : (
              <>
                <ShoppingBag className="w-5 h-5 text-amber-300" />
                <span>Add {qty} Pack{qty > 1 ? 's' : ''} to Bag (Rs. {product.price * qty})</span>
              </>
            )}
          </button>

        </div>
      </div>
    </div>
  );
}
