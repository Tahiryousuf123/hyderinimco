import React from 'react';
import { X, Trash2, Plus, Minus, ShoppingBag, ArrowRight, ShieldCheck, Truck } from 'lucide-react';

export default function CartDrawer({
  isOpen,
  onClose,
  cartItems,
  onUpdateQuantity,
  onRemoveItem,
  onProceedCheckout,
  settings
}) {
  if (!isOpen) return null;

  const subtotal = cartItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  const freeThreshold = settings?.freeDeliveryAbove || 2500;
  const standardDelivery = settings?.deliveryFee || 150;
  const isFreeDelivery = subtotal >= freeThreshold;
  const deliveryFee = cartItems.length === 0 ? 0 : (isFreeDelivery ? 0 : standardDelivery);
  const totalAmount = subtotal + deliveryFee;
  const remainingForFree = Math.max(0, freeThreshold - subtotal);
  const progressPercent = Math.min(100, Math.round((subtotal / freeThreshold) * 100));

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-black/60 backdrop-blur-xs flex justify-end animate-in fade-in duration-200">
      <div className="w-full max-w-md bg-white h-full shadow-2xl flex flex-col justify-between border-l border-gray-200 animate-in slide-in-from-right duration-300">
        
        {/* Cart Header */}
        <div className="p-4 sm:p-5 border-b border-gray-100 flex items-center justify-between bg-amber-50/50">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-red-800 text-white flex items-center justify-center shadow-xs">
              <ShoppingBag className="w-5 h-5 text-amber-300" />
            </div>
            <div>
              <h2 className="font-extrabold text-gray-900 text-lg">Your Fresh Bag</h2>
              <p className="text-xs text-gray-500 font-medium">
                {cartItems.reduce((acc, item) => acc + item.quantity, 0)} Items Selected
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-9 h-9 rounded-full bg-white text-gray-500 hover:text-gray-900 hover:bg-gray-100 flex items-center justify-center border border-gray-200 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Free Delivery Progress Banner */}
        <div className="bg-amber-50 px-4 py-3 border-b border-amber-200/60">
          <div className="flex items-center justify-between text-xs font-bold mb-1.5">
            <span className="flex items-center gap-1.5 text-amber-900">
              <Truck className="w-3.5 h-3.5 text-red-700" />
              {isFreeDelivery ? (
                <span className="text-emerald-700 font-extrabold">🎉 You unlocked FREE Delivery!</span>
              ) : (
                <span>Add Rs. {remainingForFree} more for FREE Delivery</span>
              )}
            </span>
            <span className="text-amber-800">{progressPercent}%</span>
          </div>
          <div className="w-full h-2 bg-amber-200 rounded-full overflow-hidden">
            <div
              className={`h-full transition-all duration-500 ${
                isFreeDelivery ? 'bg-emerald-500' : 'bg-red-700'
              }`}
              style={{ width: `${progressPercent}%` }}
            ></div>
          </div>
        </div>

        {/* Cart Item List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3 divide-y divide-gray-100">
          {cartItems.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center p-6 text-gray-400 space-y-3">
              <div className="w-20 h-20 rounded-full bg-amber-50 flex items-center justify-center text-4xl">
                🥟
              </div>
              <p className="font-bold text-gray-700 text-base">Your bag is empty</p>
              <p className="text-xs text-gray-500 max-w-xs">
                Explore our menu of samosas, rolls, kababs, and nimco to get started.
              </p>
              <button
                onClick={onClose}
                className="mt-2 px-5 py-2.5 bg-red-800 text-white rounded-xl text-xs font-bold hover:bg-red-900 shadow-md transition-all"
              >
                Browse Menu
              </button>
            </div>
          ) : (
            cartItems.map((item) => (
              <div key={item.id} className="pt-3 first:pt-0 flex gap-3 items-center">
                {/* Item Image */}
                <img
                  src={item.image}
                  alt={item.name}
                  className="w-16 h-16 rounded-xl object-cover bg-amber-50 border border-gray-100 shrink-0"
                />

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <h4 className="text-sm font-bold text-gray-900 truncate">
                    {item.name}
                  </h4>
                  <div className="flex items-center gap-2 text-[11px] text-gray-500 mt-0.5">
                    <span className="bg-amber-100 text-amber-900 font-bold px-1.5 py-0.2 rounded">
                      {item.packQuantity}
                    </span>
                    <span>Rs. {item.price} each</span>
                  </div>
                  <div className="font-extrabold text-sm text-red-800 mt-1">
                    Rs. {item.price * item.quantity}/-
                  </div>
                </div>

                {/* Quantity Controls */}
                <div className="flex flex-col items-end gap-1.5 shrink-0">
                  <div className="flex items-center border border-gray-200 rounded-lg bg-gray-50 p-0.5">
                    <button
                      onClick={() => onUpdateQuantity(item.id, item.quantity - 1)}
                      className="w-6 h-6 rounded bg-white text-gray-700 hover:bg-red-50 flex items-center justify-center shadow-xs"
                    >
                      <Minus className="w-3 h-3" />
                    </button>
                    <span className="w-7 text-center font-bold text-xs text-gray-900">
                      {item.quantity}
                    </span>
                    <button
                      onClick={() => onUpdateQuantity(item.id, item.quantity + 1)}
                      className="w-6 h-6 rounded bg-white text-gray-700 hover:bg-amber-50 flex items-center justify-center shadow-xs"
                    >
                      <Plus className="w-3 h-3" />
                    </button>
                  </div>

                  <button
                    onClick={() => onRemoveItem(item.id)}
                    className="text-[11px] text-gray-400 hover:text-red-600 flex items-center gap-1 transition-colors"
                  >
                    <Trash2 className="w-3 h-3" />
                    <span>Remove</span>
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Cart Footer / Checkout Summary */}
        {cartItems.length > 0 && (
          <div className="p-4 sm:p-5 border-t border-gray-200 bg-gray-50/80 space-y-3">
            {/* Price Calculations */}
            <div className="space-y-1.5 text-xs text-gray-600">
              <div className="flex justify-between">
                <span>Subtotal</span>
                <span className="font-bold text-gray-900">Rs. {subtotal}/-</span>
              </div>
              <div className="flex justify-between items-center">
                <span>Karachi Chilled Delivery</span>
                {isFreeDelivery ? (
                  <span className="text-emerald-700 font-bold uppercase text-[11px] bg-emerald-100 px-2 py-0.5 rounded">
                    Free
                  </span>
                ) : (
                  <span className="font-bold text-gray-900">Rs. {deliveryFee}/-</span>
                )}
              </div>
              <div className="border-t border-gray-200 pt-2 flex justify-between text-base font-black text-gray-900">
                <span>Total Amount</span>
                <span className="text-red-800 text-lg">Rs. {totalAmount}/-</span>
              </div>
            </div>

            {/* Trust Assurance */}
            <div className="flex items-center justify-center gap-2 text-[11px] text-gray-500 bg-white py-1.5 px-2 rounded-lg border border-gray-200">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              <span>100% Secure Pre-paid Order Processing</span>
            </div>

            {/* Checkout Action Button */}
            <button
              onClick={onProceedCheckout}
              className="w-full py-3.5 bg-gradient-to-r from-red-700 to-red-800 hover:from-red-800 hover:to-red-900 text-white rounded-2xl font-extrabold text-sm shadow-xl shadow-red-900/20 flex items-center justify-center gap-2 transition-all hover:scale-[1.01] active:scale-[0.98]"
            >
              <span>Proceed to Digital Checkout</span>
              <ArrowRight className="w-4 h-4 text-amber-300" />
            </button>
          </div>
        )}

      </div>
    </div>
  );
}
