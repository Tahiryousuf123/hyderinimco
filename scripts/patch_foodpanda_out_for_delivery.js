import fs from 'fs';
import path from 'path';

const targetFile = path.join(process.cwd(), 'scripts', 'build_luxury_theme.js');
let raw = fs.readFileSync(targetFile, 'utf8');

// Normalize CRLF to LF for safe matching
let content = raw.replace(/\r\n/g, '\n');

// 1. Add auto-sync polling in App for activeOrder
const oldCartHook = `      useEffect(() => {
        try { localStorage.setItem('hyderi_cart', JSON.stringify(cart)); } catch (e) {}
      }, [cart]);`;

const newCartHookWithPolling = `      useEffect(() => {
        try { localStorage.setItem('hyderi_cart', JSON.stringify(cart)); } catch (e) {}
      }, [cart]);

      // Auto-sync active order status in real-time (like Foodpanda)
      useEffect(() => {
        if (!activeOrder || activeOrder.status === 'cancelled' || activeOrder.status === 'completed') return;
        const syncActiveOrder = async () => {
          try {
            const res = await fetch(getApiBase() + '/api/orders/' + encodeURIComponent(activeOrder.orderRef));
            const data = await res.json();
            if (data.success && data.order && data.order.status !== activeOrder.status) {
              setActiveOrder(data.order);
              try { localStorage.setItem('hyderi_active_order', JSON.stringify(data.order)); } catch (e) {}
              setCompletedOrder(prev => (prev && prev.orderRef === data.order.orderRef ? data.order : prev));
            }
          } catch (e) {}
        };
        const syncTimer = setInterval(syncActiveOrder, 8000);
        return () => clearInterval(syncTimer);
      }, [activeOrder]);`;

if (content.includes(oldCartHook) && !content.includes('syncActiveOrder')) {
  content = content.replace(oldCartHook, newCartHookWithPolling);
  console.log('✅ 1. Real-time activeOrder auto-sync polling added to App');
} else {
  console.log('ℹ️ 1. Polling already exists or cart hook not matched');
}

// 2. Update persistent screen banner to hide Cancel button and show View Slip when out_for_delivery
const oldBannerCode = `          {/* Active Order Persistent Screen Banner */}
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

const newBannerCode = `          {/* Active Order Persistent Screen Banner */}
          {activeOrder && activeOrder.status !== 'cancelled' && activeOrder.status !== 'completed' && (
            <div className="fixed bottom-18 sm:bottom-6 left-3 right-3 sm:left-auto sm:right-6 sm:max-w-md z-40 bg-slate-950/95 backdrop-blur-md text-white rounded-2xl shadow-2xl p-3.5 border-2 border-goldBrand-400 flex items-center justify-between gap-3 animate-in slide-in-from-bottom-5">
              <div className="flex items-center gap-2.5 overflow-hidden">
                <div className={\`w-2.5 h-2.5 rounded-full \${activeOrder.status === 'out_for_delivery' ? 'bg-amber-400 animate-pulse' : 'bg-emerald-400 animate-ping'} shrink-0\`} />
                <div className="truncate text-xs">
                  <span className="font-extrabold text-goldBrand-300 block">{isUrdu ? 'آپ کا فعال آرڈر:' : 'Active Order:'} {activeOrder.orderRef}</span>
                  <span className="text-[11px] text-slate-300 capitalize">
                    {activeOrder.status === 'out_for_delivery'
                      ? (isUrdu ? '🛵 رائیڈر روانہ ہو چکا ہے' : '🛵 Out for Delivery with Rider')
                      : ((activeOrder.status ? activeOrder.status.replace(/_/g, ' ') : 'Pending') + ' • Rs. ' + activeOrder.totalAmount + '/-')
                    }
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                {(activeOrder.status === 'pending_verification' || activeOrder.status === 'payment_verified') ? (
                  <button
                    onClick={() => setCompletedOrder(activeOrder)}
                    className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-bold transition-colors shadow-sm flex items-center gap-1"
                  >
                    <span>❌</span>
                    <span>{isUrdu ? 'کینسل / رسید' : 'Cancel / Slip'}</span>
                  </button>
                ) : (
                  <button
                    onClick={() => setCompletedOrder(activeOrder)}
                    className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition-colors shadow-sm flex items-center gap-1"
                  >
                    <span>📄</span>
                    <span>{isUrdu ? 'رسید دیکھیں' : 'View Slip'}</span>
                  </button>
                )}
                <button
                  onClick={() => setIsTrackingOpen(true)}
                  className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-goldBrand-200 border border-slate-600 rounded-lg text-xs font-semibold transition-colors"
                >
                  {isUrdu ? 'ٹریک' : 'Track'}
                </button>
              </div>
            </div>
          )}`;

if (content.includes(oldBannerCode)) {
  content = content.replace(oldBannerCode, newBannerCode);
  console.log('✅ 2. Persistent screen banner updated for out_for_delivery condition');
} else {
  console.log('⚠️ 2. Persistent screen banner exact string not matched, checking variation...');
}

// 3. In OrderSuccessModal: Add Out For Delivery Foodpanda alert
const oldSuccessAlertSpot = `              {/* Cancellation Success Message */}
              {cancelSuccessMsg && (
                <div className="p-3 bg-red-50 border-2 border-red-300 rounded-xl text-red-900 font-bold text-xs flex items-center gap-2">
                  <span>⚠️</span>
                  <span>{cancelSuccessMsg}</span>
                </div>
              )}`;

const newSuccessAlertSpot = `              {/* Cancellation Success Message */}
              {cancelSuccessMsg && (
                <div className="p-3 bg-red-50 border-2 border-red-300 rounded-xl text-red-900 font-bold text-xs flex items-center gap-2">
                  <span>⚠️</span>
                  <span>{cancelSuccessMsg}</span>
                </div>
              )}

              {/* Foodpanda Style: Out For Delivery Notice */}
              {orderStatus === 'out_for_delivery' && !isCancelled && (
                <div className="p-3.5 bg-amber-50 border-2 border-amber-400/80 rounded-2xl flex items-center gap-3 text-xs text-amber-950 font-bold shadow-sm animate-in fade-in">
                  <span className="text-2xl animate-bounce">🛵</span>
                  <div>
                    <p className="font-extrabold text-amber-950 text-xs">
                      {isUrdu ? 'آرڈر رائیڈر کے حوالے ہو چکا ہے (Out for Delivery)!' : 'Order is Out for Delivery!'}
                    </p>
                    <p className="text-[11px] font-normal text-amber-800 mt-0.5">
                      {isUrdu
                        ? 'آپ کا کھانا پیک ہو کر رائیڈر نکل چکا ہے، اس لیے فوڈ پانڈا کی طرح اب آرڈر کینسل کرنے کا آپشن بند ہو گیا ہے۔'
                        : 'Your parcel is on the way with the rider. Cancellation option is now closed.'}
                    </p>
                  </div>
                </div>
              )}`;

if (content.includes(oldSuccessAlertSpot)) {
  content = content.replace(oldSuccessAlertSpot, newSuccessAlertSpot);
  console.log('✅ 3. Foodpanda Out-For-Delivery alert added to OrderSuccessModal');
} else {
  console.log('⚠️ 3. OrderSuccessModal alert spot not matched');
}

// 4. In OrderTrackingModal: Add Out For Delivery Foodpanda alert
const oldTrackingRefSpot = `            {order && (
              <div className="space-y-3 pt-2 text-xs">`;

const newTrackingRefSpot = `            {order && (
              <div className="space-y-3 pt-2 text-xs">
                {/* Foodpanda Style: Out For Delivery Notice in Tracking */}
                {order.status === 'out_for_delivery' && (
                  <div className="p-3.5 bg-amber-50 border-2 border-amber-400 rounded-2xl flex items-center gap-3 text-xs text-amber-950 font-bold shadow-sm">
                    <span className="text-2xl animate-bounce">🛵</span>
                    <div>
                      <p className="font-extrabold text-amber-950">
                        {isUrdu ? 'آرڈر رائیڈر کے حوالے ہو چکا ہے (Out for Delivery)!' : 'Order is Out for Delivery!'}
                      </p>
                      <p className="text-[11px] font-normal text-amber-800 mt-0.5">
                        {isUrdu
                          ? 'کھانا تیار ہو کر رائیڈر روانہ ہو چکا ہے، اب کینسل کا آپشن بند ہے۔ مدد کے لیے کال کریں: 0336-2438422'
                          : 'Rider is on the way with your food. Cancellation closed. Call: 0336-2438422'}
                      </p>
                    </div>
                  </div>
                )}`;

if (content.includes(oldTrackingRefSpot)) {
  content = content.replace(oldTrackingRefSpot, newTrackingRefSpot);
  console.log('✅ 4. Foodpanda Out-For-Delivery alert added to OrderTrackingModal');
} else {
  console.log('⚠️ 4. OrderTrackingModal spot not matched');
}

// Write back with CRLF
const finalOutput = content.replace(/\n/g, '\r\n');
fs.writeFileSync(targetFile, finalOutput, 'utf8');
console.log('Finished updating build_luxury_theme.js for Foodpanda-style Out-For-Delivery cancellation removal!');
