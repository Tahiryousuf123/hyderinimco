import React, { useState } from 'react';
import { ShoppingBag, Search, Phone, MapPin, Clock, Truck, ShieldCheck } from 'lucide-react';

export default function Navbar({
  cartCount,
  onOpenCart,
  searchQuery,
  setSearchQuery,
  onOpenTracking,
  settings
}) {
  const [showSearchMobile, setShowSearchMobile] = useState(false);

  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-amber-100 shadow-xs">
      {/* Top Announcement Bar */}
      <div className="bg-gradient-to-r from-red-800 via-red-900 to-amber-900 text-white text-xs py-1.5 px-4 font-medium">
        <div className="max-w-7xl mx-auto flex justify-between items-center flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <span className="bg-amber-500 text-red-950 text-[10px] font-bold px-1.5 py-0.5 rounded-full uppercase tracking-wider">
              Karachi Delivery
            </span>
            <span className="hidden sm:inline">
              {settings?.announcement || '✨ FREE Delivery across Karachi on orders above Rs. 2,500! Serving Fresh Since 1970.'}
            </span>
            <span className="sm:hidden">
              Free Delivery above Rs. 2,500!
            </span>
          </div>
          <div className="flex items-center gap-4 text-[11px] text-amber-100">
            <a
              href={`tel:${settings?.phone1 || '0336-2438422'}`}
              className="flex items-center gap-1 hover:text-white transition-colors"
            >
              <Phone className="w-3 h-3 text-amber-400" />
              <span>{settings?.phone1 || '0336-2438422'}</span>
            </a>
            <span className="hidden md:inline text-red-400">|</span>
            <span className="hidden md:flex items-center gap-1">
              <Clock className="w-3 h-3 text-amber-400" />
              <span>10:00 AM - 11:00 PM</span>
            </span>
          </div>
        </div>
      </div>

      {/* Main Navigation Bar */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
        <div className="flex items-center justify-between gap-4">
          
          {/* Brand Logo & Tagline */}
          <div className="flex items-center gap-3">
            <a href="#" className="flex items-center gap-3 group">
              <div className="w-11 h-11 sm:w-13 sm:h-13 rounded-2xl bg-gradient-to-br from-red-700 to-amber-600 flex items-center justify-center text-white shadow-md shadow-red-900/20 ring-2 ring-amber-400/30 group-hover:scale-105 transition-transform duration-200">
                <span className="text-2xl sm:text-3xl">🥟</span>
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-lg sm:text-2xl font-extrabold tracking-tight text-gray-900 font-brand">
                    NEW HYDERI
                  </span>
                  <span className="bg-amber-100 text-amber-900 text-[10px] font-bold px-1.5 py-0.5 rounded-sm border border-amber-300">
                    Est. 1970
                  </span>
                </div>
                <p className="text-[11px] sm:text-xs font-semibold text-red-700 tracking-wider uppercase">
                  Nimco & Frozen Foods
                </p>
              </div>
            </a>
          </div>

          {/* Desktop Search Bar */}
          <div className="hidden md:flex flex-1 max-w-md mx-6">
            <div className="relative w-full">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search Samosas, Rolls, Kababs, Mini Pizza, Nimco..."
                className="w-full pl-10 pr-4 py-2 bg-amber-50/60 hover:bg-amber-50 focus:bg-white text-sm rounded-full border border-amber-200/80 focus:border-red-600 focus:ring-2 focus:ring-red-100 outline-none transition-all"
              />
              <Search className="w-4 h-4 text-amber-700 absolute left-3.5 top-1/2 -translate-y-1/2" />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400 hover:text-gray-600 bg-gray-200 rounded-full w-4 h-4 flex items-center justify-center"
                >
                  ×
                </button>
              )}
            </div>
          </div>

          {/* Right Action Buttons */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Mobile Search Toggle */}
            <button
              onClick={() => setShowSearchMobile(!showSearchMobile)}
              className="md:hidden p-2 rounded-xl text-gray-700 hover:bg-amber-50 border border-gray-200"
              aria-label="Search"
            >
              <Search className="w-5 h-5 text-gray-700" />
            </button>

            {/* Track Order Button */}
            <button
              onClick={onOpenTracking}
              className="hidden lg:flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-gray-700 hover:text-red-700 bg-gray-50 hover:bg-amber-50 border border-gray-200 rounded-xl transition-all"
            >
              <Truck className="w-4 h-4 text-amber-600" />
              <span>Track Order</span>
            </button>

            {/* Direct WhatsApp Callout */}
            <a
              href={`https://wa.me/${settings?.whatsapp || '923362438422'}?text=Assalam%20o%20Alaikum%20Hyderi%20Nimco%2C%20I%20want%20to%20inquire%20about%20frozen%20items`}
              target="_blank"
              rel="noopener noreferrer"
              className="hidden sm:flex items-center gap-1.5 px-3 py-2 text-xs font-bold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-xl transition-colors"
            >
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              <span>0336-2438422</span>
            </a>

            {/* Cart Button */}
            <button
              onClick={onOpenCart}
              className="relative flex items-center gap-2 bg-gradient-to-r from-red-700 to-red-800 hover:from-red-800 hover:to-red-900 text-white px-3.5 sm:px-4 py-2 sm:py-2.5 rounded-xl shadow-md shadow-red-900/15 font-semibold text-sm transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]"
            >
              <ShoppingBag className="w-5 h-5 text-amber-300" />
              <span className="hidden sm:inline">Bag</span>
              <span className="bg-amber-400 text-red-950 text-xs font-extrabold px-2 py-0.5 rounded-full shadow-xs">
                {cartCount}
              </span>
            </button>
          </div>
        </div>

        {/* Mobile Search Bar Expansion */}
        {showSearchMobile && (
          <div className="mt-3 pt-3 border-t border-amber-100 md:hidden">
            <div className="relative w-full">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search Samosas, Rolls, Kababs, Nimco..."
                className="w-full pl-10 pr-4 py-2.5 bg-amber-50/80 text-sm rounded-xl border border-amber-200 focus:border-red-600 focus:outline-none"
                autoFocus
              />
              <Search className="w-4 h-4 text-amber-700 absolute left-3.5 top-1/2 -translate-y-1/2" />
            </div>
          </div>
        )}
      </div>
    </header>
  );
}
