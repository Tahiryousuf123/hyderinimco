import fs from 'fs';
import path from 'path';

const targetPath = path.join(process.cwd(), 'scripts', 'build_luxury_theme.js');
let raw = fs.readFileSync(targetPath, 'utf8');

// Normalize all CRLF to LF for reliable string matching
let content = raw.replace(/\r\n/g, '\n');

console.log('Original content length:', content.length);

// 1. Ensure App has activeOrder state
const oldStateHook = `const [completedOrder, setCompletedOrder] = useState(null);`;
const newStateHook = `const [completedOrder, setCompletedOrder] = useState(null);
      const [activeOrder, setActiveOrder] = useState(() => {
        try {
          const s = localStorage.getItem('hyderi_active_order');
          return s ? JSON.parse(s) : null;
        } catch(e) { return null; }
      });`;

if (content.includes(oldStateHook) && !content.includes('localStorage.getItem(\'hyderi_active_order\')')) {
  content = content.replace(oldStateHook, newStateHook);
  console.log('✅ 1. App activeOrder state hooked');
} else {
  console.log('ℹ️ 1. activeOrder state already present or matched');
}

// 2. Header Desktop button: "Track Order" -> "Track & Cancel Order"
const oldHeaderBtn = `                  {/* Order Tracking Button */}
                  <button
                    onClick={() => setIsTrackingOpen(true)}
                    className="inline-flex items-center gap-1.5 bg-emeraldBrand-950/80 hover:bg-emeraldBrand-950 text-emeraldBrand-100 border border-goldBrand-500/30 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all"
                  >
                    <span>🛵</span>
                    <span className="hidden sm:inline">{isUrdu ? 'آرڈر ٹریک کریں' : 'Track Order'}</span>
                  </button>`;

const newHeaderBtn = `                  {/* Order Tracking & Cancel Button */}
                  <button
                    onClick={() => setIsTrackingOpen(true)}
                    className="inline-flex items-center gap-1.5 bg-emeraldBrand-950/80 hover:bg-emeraldBrand-950 text-goldBrand-200 border border-goldBrand-400/50 px-2.5 sm:px-3 py-1.5 rounded-xl text-xs font-bold transition-all shadow-sm hover:border-goldBrand-300"
                    title={isUrdu ? 'آرڈر ٹریک یا کینسل کریں' : 'Track or Cancel Order'}
                  >
                    <span>🛵</span>
                    <span className="text-[11px] sm:text-xs">{isUrdu ? 'ٹریک / کینسل' : 'Track / Cancel Order'}</span>
                  </button>`;

if (content.includes(oldHeaderBtn)) {
  content = content.replace(oldHeaderBtn, newHeaderBtn);
  console.log('✅ 2. Desktop Header Track & Cancel button updated');
} else {
  console.log('⚠️ 2. Desktop Header Track button string not found, checking variations...');
  const looseRegex = /{\/\*\s*Order Tracking Button\s*\*\/}[\s\S]*?onClick=\{\(\)\s*=>\s*setIsTrackingOpen\(true\)\}[\s\S]*?<\/button>/;
  if (looseRegex.test(content)) {
    content = content.replace(looseRegex, newHeaderBtn.trim());
    console.log('✅ 2. Desktop Header Track button updated via regex');
  }
}

// 3. Mobile Bottom Nav button: "Track" -> "Track/Cancel"
const oldMobileBtn = `            <button
              onClick={() => setIsTrackingOpen(true)}
              className="flex flex-col items-center gap-0.5 text-emeraldBrand-100 hover:text-white"
            >
              <span className="text-base">🛵</span>
              <span className="text-[9px] font-bold">{isUrdu ? 'ٹریک' : 'Track'}</span>
            </button>`;

const newMobileBtn = `            <button
              onClick={() => setIsTrackingOpen(true)}
              className="flex flex-col items-center gap-0.5 text-goldBrand-300 hover:text-white"
            >
              <span className="text-base">🛵</span>
              <span className="text-[9px] font-bold">{isUrdu ? 'ٹریک/کینسل' : 'Track/Cancel'}</span>
            </button>`;

if (content.includes(oldMobileBtn)) {
  content = content.replace(oldMobileBtn, newMobileBtn);
  console.log('✅ 3. Mobile bottom nav Track/Cancel button updated');
} else {
  console.log('ℹ️ 3. Mobile bottom nav button not matched exactly');
}

// 4. Update onOrderComplete & OrderSuccessModal in App
const oldCheckoutCall = `              onOrderComplete={(order) => {
                setCompletedOrder(order);
                setCart([]);
                setIsCheckoutOpen(false);
                if (window.confetti) {
                  window.confetti({ particleCount: 90, spread: 80, origin: { y: 0.6 } });
                }
              }}`;

const newCheckoutCall = `              onOrderComplete={(order) => {
                setCompletedOrder(order);
                setActiveOrder(order);
                try { localStorage.setItem('hyderi_active_order', JSON.stringify(order)); } catch(e) {}
                setCart([]);
                setIsCheckoutOpen(false);
                if (window.confetti) {
                  window.confetti({ particleCount: 90, spread: 80, origin: { y: 0.6 } });
                }
              }}`;

if (content.includes(oldCheckoutCall)) {
  content = content.replace(oldCheckoutCall, newCheckoutCall);
  console.log('✅ 4. onOrderComplete updated with setActiveOrder');
} else {
  console.log('ℹ️ 4. onOrderComplete pattern not matched or already updated');
}

// 5. Update OrderSuccessModal JSX in App to pass onCancelOrder
const oldSuccessModalCall = `          {/* Order Success Modal */}
          {completedOrder && (
            <OrderSuccessModal
              order={completedOrder}
              isUrdu={isUrdu}
              onClose={() => setCompletedOrder(null)}
              settings={settings}
            />
          )}`;

const newSuccessModalCall = `          {/* Order Success Modal */}
          {completedOrder && (
            <OrderSuccessModal
              order={completedOrder}
              isUrdu={isUrdu}
              onClose={() => setCompletedOrder(null)}
              settings={settings}
              onCancelOrder={(updated) => {
                setCompletedOrder(updated);
                setActiveOrder(updated);
                try { localStorage.setItem('hyderi_active_order', JSON.stringify(updated)); } catch(e) {}
              }}
            />
          )}`;

if (content.includes(oldSuccessModalCall)) {
  content = content.replace(oldSuccessModalCall, newSuccessModalCall);
  console.log('✅ 5. OrderSuccessModal in App updated with onCancelOrder');
} else {
  console.log('ℹ️ 5. OrderSuccessModal JSX already updated or variation exists');
}

// 6. Persistent Floating Banner for Active Order on Screen
const oldTrackingSection = `          {/* Order Tracking Modal */}
          {isTrackingOpen && (
            <OrderTrackingModal
              isOpen={isTrackingOpen}
              isUrdu={isUrdu}
              onClose={() => setIsTrackingOpen(false)}
            />
          )}`;

const newTrackingSectionWithBanner = `          {/* Order Tracking Modal */}
          {isTrackingOpen && (
            <OrderTrackingModal
              isOpen={isTrackingOpen}
              isUrdu={isUrdu}
              onClose={() => setIsTrackingOpen(false)}
            />
          )}

          {/* Active Order Persistent Screen Banner */}
          {activeOrder && activeOrder.status !== 'cancelled' && activeOrder.status !== 'completed' && (
            <div className="fixed bottom-18 sm:bottom-6 left-3 right-3 sm:left-auto sm:right-6 sm:max-w-md z-40 bg-slate-950/95 backdrop-blur-md text-white rounded-2xl shadow-2xl p-3.5 border-2 border-goldBrand-400 flex items-center justify-between gap-3 animate-in slide-in-from-bottom-5">
              <div className="flex items-center gap-2.5 overflow-hidden">
                <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping shrink-0" />
                <div className="truncate text-xs">
                  <span className="font-extrabold text-goldBrand-300 block">{isUrdu ? 'آپ کا فعال آرڈر:' : 'Active Order:'} {activeOrder.orderRef}</span>
                  <span className="text-[11px] text-slate-300 capitalize">{activeOrder.status ? activeOrder.status.replace(/_/g, ' ') : 'Pending'} • Rs. {activeOrder.totalAmount}/-</span>
                </div>
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                <button
                  onClick={() => setCompletedOrder(activeOrder)}
                  className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-bold transition-colors shadow-sm flex items-center gap-1"
                >
                  <span>❌</span>
                  <span>{isUrdu ? 'کینسل / رسید' : 'Cancel / Slip'}</span>
                </button>
                <button
                  onClick={() => setIsTrackingOpen(true)}
                  className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-goldBrand-200 border border-slate-600 rounded-lg text-xs font-semibold transition-colors"
                >
                  {isUrdu ? 'ٹریک' : 'Track'}
                </button>
              </div>
            </div>
          )}`;

if (content.includes(oldTrackingSection)) {
  content = content.replace(oldTrackingSection, newTrackingSectionWithBanner);
  console.log('✅ 6. Persistent Floating Active Order Banner added to App');
} else {
  console.log('ℹ️ 6. Tracking section already modified or banner present');
}

// Convert back to CRLF before writing
const finalOutput = content.replace(/\n/g, '\r\n');
fs.writeFileSync(targetPath, finalOutput, 'utf8');
console.log('Finished updating build_luxury_theme.js! New length:', finalOutput.length);
