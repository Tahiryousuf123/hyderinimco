import React from 'react';
import { Sparkles, ShieldCheck, Flame, Award, ArrowRight, MessageCircle } from 'lucide-react';

export default function HeroBanner({ onExploreMenu, settings }) {
  return (
    <div className="relative overflow-hidden bg-gradient-to-br from-amber-500/10 via-red-50 to-orange-50/30 border-b border-amber-100/80">
      {/* Decorative background blobs */}
      <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-br from-amber-400/20 to-red-500/10 rounded-full blur-3xl -mr-20 -mt-20 pointer-events-none"></div>
      <div className="absolute bottom-0 left-1/3 w-80 h-80 bg-red-400/10 rounded-full blur-2xl pointer-events-none"></div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 relative z-10">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
          
          {/* Left Column: Headline & Details */}
          <div className="lg:col-span-7 space-y-5 text-center lg:text-left">
            {/* Heritage Badge */}
            <div className="inline-flex items-center gap-2 bg-gradient-to-r from-red-800 to-red-950 text-white px-3.5 py-1.5 rounded-full text-xs font-semibold shadow-md shadow-red-950/20 ring-1 ring-amber-400/40">
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              <span>North Nazimabad's Iconic Taste Since 1970</span>
            </div>

            {/* Main Headline */}
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black text-gray-900 leading-tight tracking-tight">
              Crispy, Handcrafted <br className="hidden sm:inline" />
              <span className="bg-gradient-to-r from-red-700 via-red-800 to-amber-600 bg-clip-text text-transparent">
                Frozen Delights & Nimco
              </span>
            </h1>

            {/* Subtitle */}
            <p className="text-gray-600 text-sm sm:text-base max-w-xl mx-auto lg:mx-0 leading-relaxed">
              Stock your freezer with Karachi’s finest 1-bite samosas, crispy spring rolls, juicy shami kababs, mini pizzas, and authentic freshly fried Nimco. Prepared daily with premium ingredients and 100% Halal meats.
            </p>

            {/* Action Buttons */}
            <div className="flex flex-wrap items-center justify-center lg:justify-start gap-3 pt-2">
              <button
                onClick={onExploreMenu}
                className="flex items-center gap-2 bg-gradient-to-r from-red-700 to-red-800 hover:from-red-800 hover:to-red-900 text-white px-6 py-3 rounded-xl font-bold text-sm shadow-lg shadow-red-900/25 transition-all hover:scale-105 active:scale-95"
              >
                <span>Browse Full Menu</span>
                <ArrowRight className="w-4 h-4 text-amber-300" />
              </button>

              <a
                href={`https://wa.me/${settings?.whatsapp || '923362438422'}?text=Assalam%20o%20Alaikum%2C%20I%20want%20to%20place%20an%20order%20for%20Hyderi%20Nimco%20%26%20Frozen%20items`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-5 py-3 rounded-xl font-bold text-sm shadow-md shadow-emerald-700/20 transition-all hover:scale-105"
              >
                <MessageCircle className="w-4 h-4 text-white" />
                <span>WhatsApp Order</span>
              </a>
            </div>

            {/* Trust Badges */}
            <div className="grid grid-cols-3 gap-2 sm:gap-4 pt-4 max-w-lg mx-auto lg:mx-0 border-t border-amber-200/60">
              <div className="flex items-center gap-2 text-left">
                <div className="w-8 h-8 rounded-lg bg-red-100 text-red-700 flex items-center justify-center shrink-0">
                  <ShieldCheck className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-xs font-bold text-gray-900">100% Halal</p>
                  <p className="text-[10px] text-gray-500">Pure Quality</p>
                </div>
              </div>

              <div className="flex items-center gap-2 text-left">
                <div className="w-8 h-8 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center shrink-0">
                  <Flame className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-xs font-bold text-gray-900">Ready to Fry</p>
                  <p className="text-[10px] text-gray-500">5 Mins Prep</p>
                </div>
              </div>

              <div className="flex items-center gap-2 text-left">
                <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
                  <Award className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-xs font-bold text-gray-900">50+ Years</p>
                  <p className="text-[10px] text-gray-500">Hyderi Legacy</p>
                </div>
              </div>
            </div>

          </div>

          {/* Right Column: Featured Visual Food Showcase */}
          <div className="lg:col-span-5 relative">
            <div className="relative mx-auto max-w-md">
              
              {/* Main Card Image Showcase */}
              <div className="relative rounded-3xl overflow-hidden shadow-2xl border-4 border-white bg-white">
                <img
                  src="https://images.unsplash.com/photo-1601050690597-df0568f70950?auto=format&fit=crop&w=800&q=80"
                  alt="Hyderi Samosas & Rolls"
                  className="w-full h-72 sm:h-80 object-cover transform hover:scale-105 transition-transform duration-500"
                />
                
                {/* Floating Price Tag */}
                <div className="absolute top-4 right-4 bg-white/95 backdrop-blur-md px-3.5 py-2 rounded-2xl shadow-lg border border-amber-200">
                  <p className="text-[10px] font-bold uppercase text-red-700">Starting From</p>
                  <p className="text-lg font-black text-gray-900">Rs. 220/-</p>
                </div>

                {/* Bottom Overlay Info */}
                <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/90 via-black/60 to-transparent p-4 text-white">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-bold text-sm text-amber-300">Family & Party Packs</p>
                      <p className="text-xs text-gray-200">Available in 6, 12, 24 pcs & 1kg bags</p>
                    </div>
                    <span className="bg-red-600 text-white text-[11px] font-extrabold px-2.5 py-1 rounded-lg">
                      Freshly Frozen
                    </span>
                  </div>
                </div>
              </div>

              {/* Floating Mini Badge Left */}
              <div className="absolute -bottom-4 -left-4 bg-white rounded-2xl p-3 shadow-xl border border-gray-100 hidden sm:flex items-center gap-3 animate-bounce duration-1000">
                <div className="w-10 h-10 rounded-xl bg-amber-500 text-white flex items-center justify-center font-bold text-lg">
                  🥟
                </div>
                <div>
                  <p className="text-xs font-bold text-gray-900">One Bite Samosas</p>
                  <p className="text-[10px] text-emerald-600 font-semibold">24 Pcs Pack • Instant Fry</p>
                </div>
              </div>

              {/* Floating Mini Badge Right */}
              <div className="absolute -top-3 -right-3 bg-red-700 text-white rounded-2xl px-3.5 py-2 shadow-lg hidden sm:flex items-center gap-2 border border-red-500">
                <span className="text-xs font-black tracking-wider uppercase">Karachi Fast Express</span>
              </div>

            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
