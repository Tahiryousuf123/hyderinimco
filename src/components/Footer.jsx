import React from 'react';
import { Phone, MapPin, Clock, MessageCircle, ShieldCheck, Heart, Lock } from 'lucide-react';

export default function Footer({ onOpenAdmin, settings }) {
  return (
    <footer className="bg-gradient-to-b from-slate-900 to-slate-950 text-white pt-14 pb-8 border-t border-red-900/40 relative">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Main Footer Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 pb-12 border-b border-slate-800">
          
          {/* Col 1: Brand & Heritage */}
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-red-700 to-amber-600 flex items-center justify-center text-2xl shadow-lg ring-2 ring-amber-400/30">
                🥟
              </div>
              <div>
                <h3 className="font-extrabold text-xl tracking-tight text-white font-brand">
                  NEW HYDERI
                </h3>
                <p className="text-xs text-amber-400 font-bold uppercase tracking-wider">
                  Nimco & Frozen Foods
                </p>
              </div>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">
              Karachi's trusted name for crispy handcrafted one-bite samosas, spring rolls, tender shami kababs, mini pizzas, and fresh savoury Nimco since 1970.
            </p>
            <div className="flex items-center gap-2 text-xs text-emerald-400 font-semibold bg-emerald-950/50 py-1.5 px-3 rounded-lg border border-emerald-800/40 w-fit">
              <ShieldCheck className="w-4 h-4" />
              <span>100% Halal & Pure Quality Guaranteed</span>
            </div>
          </div>

          {/* Col 2: Shop Location & Direct Contacts */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-amber-400">
              Branch Location
            </h4>
            <div className="flex items-start gap-2.5 text-xs text-slate-300">
              <MapPin className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
              <span>
                {settings?.address || 'Shop # 20-21, Burhani Bagh Building, Block E, North Nazimabad, Hyderi, Karachi.'}
              </span>
            </div>

            <div className="space-y-2 pt-2">
              <a
                href={`tel:${settings?.phone1 || '0336-2438422'}`}
                className="flex items-center gap-2 text-xs text-slate-300 hover:text-amber-400 transition-colors"
              >
                <Phone className="w-4 h-4 text-amber-400" />
                <span>{settings?.phone1 || '0336-2438422'} (Mobile & WhatsApp)</span>
              </a>

              <a
                href={`tel:${settings?.phone2 || '021-36625698'}`}
                className="flex items-center gap-2 text-xs text-slate-300 hover:text-amber-400 transition-colors"
              >
                <Phone className="w-4 h-4 text-amber-400" />
                <span>{settings?.phone2 || '021-36625698'} (Shop Landline)</span>
              </a>
            </div>
          </div>

          {/* Col 3: Timings & Delivery Zones */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-amber-400">
              Operational Hours
            </h4>
            <div className="flex items-center gap-2 text-xs text-slate-300">
              <Clock className="w-4 h-4 text-amber-400 shrink-0" />
              <span>Mon - Sun: 10:00 AM - 11:00 PM</span>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed pt-1">
              Freshly pre-packed in food-grade insulated chill bags to maintain peak crispiness upon home frying.
            </p>
            <div className="text-xs text-slate-400">
              <span className="text-white font-bold">Delivery Areas: </span>
              North Nazimabad, Gulshan, FB Area, DHA, Clifton, Johar & all Karachi sectors.
            </div>
          </div>

          {/* Col 4: Pre-Paid Corporate Billing Badges */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-amber-400">
              Verified Pre-Paid Billing
            </h4>
            <p className="text-xs text-slate-400">
              Direct Bank Wire Transfer (Meezan / HBL / Raast) and Instant Mobile Wallets (EasyPaisa / JazzCash).
            </p>
            <div className="flex flex-wrap gap-2 pt-1">
              <span className="px-2.5 py-1 bg-slate-800 text-slate-300 text-[11px] font-bold rounded-lg border border-slate-700">
                🏦 Meezan Bank
              </span>
              <span className="px-2.5 py-1 bg-slate-800 text-slate-300 text-[11px] font-bold rounded-lg border border-slate-700">
                🏦 HBL
              </span>
              <span className="px-2.5 py-1 bg-emerald-950 text-emerald-300 text-[11px] font-bold rounded-lg border border-emerald-800">
                ⚡ Raast Pay
              </span>
              <span className="px-2.5 py-1 bg-emerald-900 text-white text-[11px] font-bold rounded-lg border border-emerald-700">
                📱 EasyPaisa
              </span>
              <span className="px-2.5 py-1 bg-amber-950 text-amber-300 text-[11px] font-bold rounded-lg border border-amber-800">
                📱 JazzCash
              </span>
            </div>
          </div>

        </div>

        {/* Bottom Bar with Discreet Admin Trigger */}
        <div className="pt-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500">
          <p>© {new Date().getFullYear()} New Hyderi Nimco & Frozen. All Rights Reserved.</p>
          
          <div className="flex items-center gap-4">
            <span>Serving Karachi Since 1970</span>
            
            {/* Discreet Admin Portal Link */}
            <button
              onClick={onOpenAdmin}
              className="text-slate-600 hover:text-slate-400 p-1 transition-colors flex items-center gap-1 text-[11px]"
              title="Store Management"
            >
              <Lock className="w-3 h-3" />
              <span className="opacity-60 hover:opacity-100">Portal</span>
            </button>
          </div>
        </div>

      </div>
    </footer>
  );
}
