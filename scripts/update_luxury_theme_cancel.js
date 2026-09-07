import fs from 'fs';
import path from 'path';

const filePath = path.join(process.cwd(), 'scripts', 'build_luxury_theme.js');
let content = fs.readFileSync(filePath, 'utf8');

// 1. Add activeOrder state in App
const oldAppHooks = 'const [completedOrder, setCompletedOrder] = useState(null);';
const newAppHooks = `const [completedOrder, setCompletedOrder] = useState(null);
      const [activeOrder, setActiveOrder] = useState(() => {
        try {
          const s = localStorage.getItem('hyderi_active_order');
          return s ? JSON.parse(s) : null;
        } catch(e) { return null; }
      });`;

if (content.includes(oldAppHooks)) {
  content = content.replace(oldAppHooks, newAppHooks);
  console.log('✅ 1. App activeOrder state added');
}

// 2. onOrderComplete updates activeOrder & localStorage
const oldOnOrderComplete = `onOrderComplete={(order) => {
                setCompletedOrder(order);
                setCart([]);`;

const newOnOrderComplete = `onOrderComplete={(order) => {
                setCompletedOrder(order);
                setActiveOrder(order);
                try { localStorage.setItem('hyderi_active_order', JSON.stringify(order)); } catch(e) {}
                setCart([]);`;

if (content.includes(oldOnOrderComplete)) {
  content = content.replace(oldOnOrderComplete, newOnOrderComplete);
  console.log('✅ 2. onOrderComplete updated');
}

// 3. Persistent floating active order banner in App
const oldTrackingCall = `{/* Order Tracking Modal */}
          {isTrackingOpen && (
            <OrderTrackingModal
              isOpen={isTrackingOpen}
              isUrdu={isUrdu}
              onClose={() => setIsTrackingOpen(false)}
            />
          )}`;

const newTrackingCall = `{/* Order Tracking Modal */}
          {isTrackingOpen && (
            <OrderTrackingModal
              isOpen={isTrackingOpen}
              isUrdu={isUrdu}
              onClose={() => setIsTrackingOpen(false)}
            />
          )}

          {/* Active Order Persistent Screen Banner */}
          {activeOrder && activeOrder.status !== 'cancelled' && activeOrder.status !== 'completed' && (
            <div className="fixed bottom-4 left-4 right-4 sm:left-auto sm:right-6 sm:max-w-md z-40 bg-slate-950/95 backdrop-blur-md text-white rounded-2xl shadow-2xl p-3.5 border-2 border-goldBrand-400 flex items-center justify-between gap-3 animate-in slide-in-from-bottom-5">
              <div className="flex items-center gap-2.5 overflow-hidden">
                <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping shrink-0" />
                <div className="truncate text-xs">
                  <span className="font-extrabold text-goldBrand-300 block">{isUrdu ? 'موجودہ آرڈر:' : 'Active Order:'} {activeOrder.orderRef}</span>
                  <span className="text-[11px] text-slate-300 capitalize">{activeOrder.status ? activeOrder.status.replace(/_/g, ' ') : 'Pending'} • Rs. {activeOrder.totalAmount}/-</span>
                </div>
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                <button
                  onClick={() => setCompletedOrder(activeOrder)}
                  className="px-2.5 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-bold transition-colors shadow-sm"
                >
                  {isUrdu ? 'کینسل / رسید' : 'Cancel / Slip'}
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

if (content.includes(oldTrackingCall)) {
  content = content.replace(oldTrackingCall, newTrackingCall);
  console.log('✅ 3. Persistent floating active order banner added');
}

// 4. Upgraded OrderSuccessModal and OrderTrackingModal
const lines = content.split('\n');
const startSuccess = lines.findIndex(l => l.includes('function OrderSuccessModal({ order, isUrdu, onClose, settings }) {'));
const startTracking = lines.findIndex(l => l.includes('function OrderTrackingModal({ isOpen, isUrdu, onClose }) {'));
const startChatbot = lines.findIndex(l => l.includes('function HyderiAIChatbot('));

if (startSuccess !== -1 && startTracking !== -1 && startChatbot !== -1) {
  console.log(`Found modals: Success=${startSuccess}, Tracking=${startTracking}, Chatbot=${startChatbot}`);

  const beforeModals = lines.slice(0, startSuccess).join('\n');
  const afterModals = lines.slice(startChatbot).join('\n');

  const newModalsCode = `    // Order Success Modal with Instant Customer Cancellation
    function OrderSuccessModal({ order, isUrdu, onClose, settings, onCancelOrder }) {
      const [copied, setCopied] = useState(false);
      const [orderStatus, setOrderStatus] = useState(order?.status || 'pending_verification');
      const [showCancelPrompt, setShowCancelPrompt] = useState(false);
      const [cancelReason, setCancelReason] = useState('Ghalat item select ho gaya (Ordered wrong item)');
      const [customReason, setCustomReason] = useState('');
      const [cancelLoading, setCancelLoading] = useState(false);
      const [cancelError, setCancelError] = useState('');
      const [cancelSuccessMsg, setCancelSuccessMsg] = useState('');

      const copyRef = () => {
        navigator.clipboard.writeText(order.orderRef);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      };

      const handleCancelOrder = async () => {
        setCancelLoading(true);
        setCancelError('');
        const finalReason = cancelReason.includes('Other') && customReason.trim() ? customReason.trim() : cancelReason;
        try {
          const res = await fetch(getApiBase() + '/api/orders/' + encodeURIComponent(order.orderRef) + '/cancel', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ reason: finalReason })
          });
          const data = await res.json();
          if (res.ok && data.success) {
            setOrderStatus('cancelled');
            setCancelSuccessMsg(isUrdu ? 'آپ کا آرڈر منسوخ کر دیا گیا ہے۔ کنفرمیشن واٹس ایپ پر بھیج دی گئی ہے۔' : 'Your order has been cancelled successfully. Confirmation sent via WhatsApp.');
            setShowCancelPrompt(false);
            try {
              const saved = localStorage.getItem('hyderi_active_order');
              if (saved) {
                const parsed = JSON.parse(saved);
                parsed.status = 'cancelled';
                localStorage.setItem('hyderi_active_order', JSON.stringify(parsed));
              }
            } catch (e) {}
            if (onCancelOrder) onCancelOrder(data.order || { ...order, status: 'cancelled' });
          } else {
            throw new Error(data.message || 'Order cancel nahi ho saka.');
          }
        } catch (err) {
          setCancelError(err.message || 'Error cancelling order');
        } finally {
          setCancelLoading(false);
        }
      };

      const generateWhatsAppLink = () => {
        const items = (order.items || []).map(i => \\\`• \\\${i.nameUrdu || i.name} (\\\${i.packQuantityUrdu || i.packQuantity}) x \\\${i.quantity} = Rs. \\\${i.price * i.quantity}\\\`).join('%0A');
        const text = \\\`*HYDERI NIMCO & FROZEN - ONLINE ORDER*%0A%0A\\\` +
          \\\`*Order Ref:* \\\${order.orderRef}%0A\\\` +
          \\\`*Customer:* \\\${order.customer?.fullName}%0A\\\` +
          \\\`*Phone:* \\\${order.customer?.phone}%0A\\\` +
          \\\`*Area:* \\\${order.customer?.area}%0A\\\` +
          \\\`*Address:* \\\${order.customer?.address}%0A%0A\\\` +
          \\\`*ITEMS:*%0A\\\${items}%0A%0A\\\` +
          \\\`*Subtotal:* Rs. \\\${order.subtotal}/-%0A\\\` +
          \\\`*Delivery Fee:* Rs. \\\${order.deliveryFee}/-%0A\\\` +
          \\\`*Total Paid:* Rs. \\\${order.totalAmount}/-%0A%0A\\\` +
          \\\`*Payment Channel:* \\\${order.paymentMethod?.toUpperCase()}%0A\\\` +
          \\\`*Sender Name:* \\\${order.paymentDetails?.senderAccountName || 'N/A'}%0A\\\` +
          \\\`*TID:* \\\${order.paymentDetails?.transactionId || 'N/A'}%0A%0A\\\` +
          \\\`_Please dispatch my fresh order!_\\\`;
        return \\\`https://wa.me/\\\${settings.whatsapp || '923362438422'}?text=\\\${text}\\\`;
      };

      const isCancelled = orderStatus === 'cancelled';
      const isCancellable = orderStatus === 'pending_verification' || orderStatus === 'payment_verified';

      return (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/80 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full overflow-hidden shadow-2xl border-2 border-goldBrand-400 animate-in zoom-in-95">
            {/* Header */}
            <div className={\\\`p-6 text-center border-b border-goldBrand-400 text-white \\\${isCancelled ? 'bg-gradient-to-br from-red-800 to-rose-950' : 'bg-emeraldBrand-950'}\\\`}>
              <div className={\\\`w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-2 text-2xl font-bold shadow-lg \\\${isCancelled ? 'bg-red-200 text-red-900' : 'bg-goldBrand-500 text-emeraldBrand-950'}\\\`}>
                {isCancelled ? '✕' : '✓'}
              </div>
              <span className={\\\`text-xs font-black uppercase px-3 py-1 rounded-full border \\\${isCancelled ? 'bg-red-500/30 text-red-200 border-red-400/40' : 'bg-emerald-500/30 text-goldBrand-300 border-goldBrand-400/40'}\\\`}>
                {isCancelled ? (isUrdu ? 'آرڈر منسوخ (Cancelled)' : 'Order Cancelled') : (isUrdu ? (order.paymentMethod === 'cod' ? 'کیش آن ڈیلیوری آرڈر موصول' : 'آرڈر موصول اور تصدیق') : (order.paymentMethod === 'cod' ? 'Cash on Delivery Confirmed' : 'Order Submitted'))}
              </span>
              <h2 className="text-2xl font-black text-goldBrand-300 mt-2 font-serifBrand">
                {isCancelled ? (isUrdu ? 'آرڈر منسوخ کر دیا گیا ہے' : 'Order Has Been Cancelled') : (isUrdu ? 'آپ کے آرڈر کا بہت شکریہ!' : 'Thank You for Your Order!')}
              </h2>
              <p className="text-xs text-emeraldBrand-100 mt-1">
                {isCancelled ? (isUrdu ? 'آپ کا آرڈر کینسل ہو چکا ہے۔ ریفنڈ کے لیے ہیلپ لائن 0336-2438422 فعال ہے۔' : 'Your order has been cancelled. For refunds or questions, call 0336-2438422.') : (isUrdu ? 'آپ کا آرڈر نارتھ ناظم آباد برانچ میں پیک کیا جا رہا ہے۔' : 'Your order is queued in our North Nazimabad kitchen.')}
              </p>
            </div>

            <div className="p-6 space-y-4 max-h-[60vh] overflow-y-auto text-xs">
              {/* Cancellation Success Message */}
              {cancelSuccessMsg && (
                <div className="p-3 bg-red-50 border-2 border-red-300 rounded-xl text-red-900 font-bold text-xs flex items-center gap-2">
                  <span>⚠️</span>
                  <span>{cancelSuccessMsg}</span>
                </div>
              )}

              {/* Automatic Shop Alert + Customer Slip Badge */}
              {!isCancelled && (
                <div className="bg-emerald-50 border-2 border-emerald-400/60 p-3.5 rounded-2xl flex items-center gap-3 text-xs text-emerald-950 shadow-sm">
                  <span className="text-2xl">🔔</span>
                  <div>
                    <p className="font-black text-emerald-950">
                      {isUrdu ? 'دکان والے کو فوری واٹس ایپ الرٹ پہنچ گیا!' : 'Shop Owner Alerted via WhatsApp!'}
                    </p>
                    <p className="text-[11px] text-emerald-800 mt-0.5">
                      {isUrdu
                        ? 'آپ کو بھی آپ کے نمبر پر آرڈر رسید واٹس ایپ پر بھیجی جا رہی ہے۔'
                        : 'An official order receipt slip is being sent to your WhatsApp number.'}
                    </p>
                  </div>
                </div>
              )}

              <div className="flex items-center justify-between bg-parchment-100 p-3.5 rounded-2xl border border-goldBrand-400">
                <div>
                  <span className="text-[10px] text-emeraldBrand-900 uppercase font-bold">{isUrdu ? 'آرڈر ٹریکنگ ریفرنس نمبر' : 'Order Tracking Ref'}</span>
                  <p className="font-mono font-black text-lg text-emeraldBrand-950">{order.orderRef}</p>
                </div>
                <button onClick={copyRef} className="bg-white hover:bg-parchment-200 text-gray-700 px-3 py-1.5 rounded-xl font-bold border border-goldBrand-400/60">
                  {copied ? (isUrdu ? '✓ کاپی ہوگیا' : '✓ Copied') : (isUrdu ? 'کاپی کریں' : 'Copy')}
                </button>
              </div>

              {/* Cancel Order Inline Dialog */}
              {showCancelPrompt && isCancellable && (
                <div className="p-4 bg-red-50/90 border-2 border-red-300 rounded-2xl space-y-3 animate-in fade-in zoom-in-95">
                  <div className="flex items-center gap-2 text-red-950 font-black text-xs">
                    <span>⚠️</span>
                    <span>{isUrdu ? 'کیا آپ واقعی یہ آرڈر کینسل کرنا چاہتے ہیں؟' : 'Are you sure you want to cancel this order?'}</span>
                  </div>
                  <p className="text-[11px] text-red-700">
                    {isUrdu ? 'کینسل کرنے کی وجہ منتخب کریں:' : 'Select cancellation reason:'}
                  </p>
                  <select
                    value={cancelReason}
                    onChange={(e) => setCancelReason(e.target.value)}
                    className="w-full text-xs p-2 bg-white border border-red-200 rounded-lg outline-none font-medium"
                  >
                    <option value="Ghalat item select ho gaya (Ordered wrong item)">{isUrdu ? 'غلط آئٹم سلیکٹ ہو گیا (Ordered wrong item)' : 'Ordered wrong item'}</option>
                    <option value="Pate / Address mein tabdeeli karni hai (Change address)">{isUrdu ? 'پتے میں تبدیلی کرنی ہے (Change address)' : 'Change address'}</option>
                    <option value="Delivery timing ka masla hai (Timing issue)">{isUrdu ? 'ڈیلیوری ٹائمنگ کا مسئلہ ہے (Timing issue)' : 'Delivery timing issue'}</option>
                    <option value="Raqam / Payment problem">{isUrdu ? 'پیمنٹ کا مسئلہ ہے (Payment problem)' : 'Payment issue'}</option>
                    <option value="Other reason (Koi doosri wajah)">{isUrdu ? 'کوئی دوسری وجہ (Other reason)' : 'Other reason'}</option>
                  </select>
                  {cancelReason.includes('Other') && (
                    <input
                      type="text"
                      value={customReason}
                      onChange={(e) => setCustomReason(e.target.value)}
                      placeholder={isUrdu ? 'وجہ درج کریں...' : 'Enter reason...'}
                      className="w-full text-xs p-2 bg-white border border-red-200 rounded-lg outline-none"
                    />
                  )}
                  {cancelError && <p className="text-[11px] text-red-600 font-bold">{cancelError}</p>}
                  <div className="flex gap-2 pt-1">
                    <button
                      onClick={handleCancelOrder}
                      disabled={cancelLoading}
                      className="flex-1 py-2 bg-red-700 hover:bg-red-800 text-white rounded-lg font-bold text-xs shadow transition-all"
                    >
                      {cancelLoading ? (isUrdu ? 'کینسل ہو رہا ہے...' : 'Cancelling...') : (isUrdu ? 'ہاں، کینسل کریں' : 'Yes, Cancel Order')}
                    </button>
                    <button
                      onClick={() => setShowCancelPrompt(false)}
                      className="px-3 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg font-bold text-xs"
                    >
                      {isUrdu ? 'واپس' : 'Back'}
                    </button>
                  </div>
                </div>
              )}

              {/* Itemized list */}
              <div className="border border-goldBrand-400/40 rounded-2xl p-4 bg-parchment-50 space-y-2">
                <h4 className="font-bold text-emeraldBrand-950 border-b pb-1">{isUrdu ? 'رسید کی تفصیل' : 'Itemized Receipt'}</h4>
                {(order.items || []).map((it, idx) => (
                  <div key={idx} className="flex justify-between text-gray-700">
                    <span><b>{it.quantity}x</b> {isUrdu ? (it.nameUrdu || it.name) : it.name} ({it.packQuantity})</span>
                    <span className="font-bold font-mono">Rs. {it.price * it.quantity}/-</span>
                  </div>
                ))}
                <div className="border-t pt-1 space-y-1">
                  <div className="flex justify-between text-gray-600"><span>{isUrdu ? 'سب ٹوٹل:' : 'Subtotal:'}</span><span className="font-mono">Rs. {order.subtotal}/-</span></div>
                  <div className="flex justify-between text-gray-600"><span>{isUrdu ? 'ڈیلیوری:' : 'Delivery:'}</span><span className="font-mono">{order.deliveryFee === 0 ? 'FREE' : \\\`Rs. \\\${order.deliveryFee}/-\\\`}</span></div>
                  <div className="flex justify-between font-black text-sm text-emeraldBrand-950 pt-1 border-t"><span>{isUrdu ? 'کل رقم:' : 'Total Amount:'}</span><span className="font-mono text-emeraldBrand-900">Rs. {order.totalAmount}/-</span></div>
                </div>
              </div>
            </div>

            <div className="p-4 sm:p-5 border-t border-goldBrand-400/40 bg-parchment-50 space-y-2">
              {!isCancelled && (
                <a
                  href={generateWhatsAppLink()}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-xs shadow-lg flex items-center justify-center gap-2"
                >
                  <span>💬 {isUrdu ? 'دکان کے واٹس ایپ پر آرڈر بھیجیں (0336-2438422)' : 'Send Order to Shop WhatsApp (0336-2438422)'}</span>
                </a>
              )}

              <div className="flex gap-2">
                <button onClick={() => window.print()} className="flex-1 py-2 bg-white border border-gray-300 rounded-xl font-bold text-gray-700">
                  🖨️ {isUrdu ? 'رسید پرنٹ کریں' : 'Print Invoice'}
                </button>
                {!isCancelled && isCancellable && !showCancelPrompt && (
                  <button
                    type="button"
                    onClick={() => setShowCancelPrompt(true)}
                    className="flex-1 py-2 bg-rose-100 hover:bg-rose-200 text-rose-800 border border-rose-300 rounded-xl font-bold text-xs transition-colors"
                  >
                    ❌ {isUrdu ? 'آرڈر کینسل کریں' : 'Cancel Order'}
                  </button>
                )}
                <button onClick={onClose} className="flex-1 py-2 bg-emeraldBrand-900 text-goldBrand-200 rounded-xl font-bold">
                  {isUrdu ? 'بند کریں' : 'Close'}
                </button>
              </div>
            </div>
          </div>
        </div>
      );
    }

    // Order Tracking Modal with Instant Cancellation
    function OrderTrackingModal({ isOpen, isUrdu, onClose }) {
      const [ref, setRef] = useState('');
      const [order, setOrder] = useState(null);
      const [loading, setLoading] = useState(false);
      const [error, setError] = useState('');
      const [showCancelPrompt, setShowCancelPrompt] = useState(false);
      const [cancelReason, setCancelReason] = useState('Ghalat item select ho gaya');
      const [cancelLoading, setCancelLoading] = useState(false);
      const [cancelSuccessMsg, setCancelSuccessMsg] = useState('');

      const handleSearch = async (e) => {
        if (e) e.preventDefault();
        if (!ref.trim()) return;
        setLoading(true);
        setError('');
        setOrder(null);
        setShowCancelPrompt(false);
        setCancelSuccessMsg('');
        try {
          const res = await fetch(getApiBase() + '/api/orders/' + encodeURIComponent(ref.trim()));
          const data = await res.json();
          if (data.success && data.order) {
            setOrder(data.order);
          } else {
            setError(isUrdu ? 'آرڈر ریفرنس نہیں ملا۔' : 'Order reference not found.');
          }
        } catch (err) {
          setError(isUrdu ? 'سرور سے رابطہ نہ ہو سکا۔' : 'Could not connect to tracking server.');
        } finally {
          setLoading(false);
        }
      };

      const handleCancelInTracking = async () => {
        if (!order) return;
        setCancelLoading(true);
        try {
          const res = await fetch(getApiBase() + '/api/orders/' + encodeURIComponent(order.orderRef) + '/cancel', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ reason: cancelReason })
          });
          const data = await res.json();
          if (res.ok && data.success) {
            setOrder(prev => ({ ...prev, status: 'cancelled' }));
            setCancelSuccessMsg(isUrdu ? 'آرڈر منسوخ کر دیا گیا ہے۔' : 'Order has been cancelled.');
            setShowCancelPrompt(false);
            try {
              const saved = localStorage.getItem('hyderi_active_order');
              if (saved) {
                const parsed = JSON.parse(saved);
                if (parsed.orderRef === order.orderRef) {
                  parsed.status = 'cancelled';
                  localStorage.setItem('hyderi_active_order', JSON.stringify(parsed));
                }
              }
            } catch(e) {}
          } else {
            setError(data.message || 'Cancellation failed');
          }
        } catch (e) {
          setError('Error cancelling order');
        } finally {
          setCancelLoading(false);
        }
      };

      if (!isOpen) return null;

      const isCancelled = order?.status === 'cancelled';
      const isCancellable = order?.status === 'pending_verification' || order?.status === 'payment_verified';

      return (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/80 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 space-y-4 shadow-2xl border-2 border-goldBrand-400 animate-in zoom-in-95">
            <div className="flex justify-between items-center border-b pb-3">
              <h3 className="font-extrabold text-base text-emeraldBrand-950 flex items-center gap-2 font-serifBrand">
                <span>🛵</span> {isUrdu ? 'اپنا آرڈر ٹریک کریں' : 'Track Your Order'}
              </h3>
              <button onClick={onClose} className="text-gray-400 hover:text-gray-700 font-bold">✕</button>
            </div>

            <form onSubmit={handleSearch} className="flex gap-2">
              <input
                type="text"
                value={ref}
                onChange={(e) => setRef(e.target.value.toUpperCase())}
                placeholder="HYD-123456"
                className="flex-1 px-4 py-2.5 bg-parchment-50 border rounded-xl text-sm font-mono uppercase outline-none focus:border-emeraldBrand-800"
              />
              <button type="submit" className="px-5 py-2.5 bg-emeraldBrand-800 hover:bg-emeraldBrand-900 text-goldBrand-200 rounded-xl text-xs font-bold">
                {loading ? (isUrdu ? 'تلاش ہو رہا ہے...' : 'Searching...') : (isUrdu ? 'ٹریک کریں' : 'Track')}
              </button>
            </form>

            {error && <p className="text-xs text-red-600 font-bold bg-red-50 p-2 rounded-lg">{error}</p>}
            {cancelSuccessMsg && <p className="text-xs text-emerald-800 font-bold bg-emerald-50 p-2 rounded-lg border border-emerald-300">✓ {cancelSuccessMsg}</p>}

            {order && (
              <div className="space-y-3 pt-2 text-xs">
                <div className="bg-parchment-100 p-4 rounded-2xl border border-goldBrand-400">
                  <div className="flex justify-between font-bold">
                    <span>{isUrdu ? 'آرڈر:' : 'Order:'} {order.orderRef}</span>
                    <span className="text-emeraldBrand-900 font-mono">Rs. {order.totalAmount}/-</span>
                  </div>
                  <div className="flex justify-between items-center mt-2">
                    <p className="text-gray-600">{isUrdu ? 'اسٹیٹس:' : 'Status:'} <b className={\\\`uppercase \\\${isCancelled ? 'text-red-700 font-black' : 'text-emeraldBrand-800'}\\\`}>{order.status ? order.status.replace(/_/g, ' ') : 'Pending'}</b></p>
                    {isCancellable && !showCancelPrompt && (
                      <button
                        onClick={() => setShowCancelPrompt(true)}
                        className="px-2.5 py-1 bg-rose-100 hover:bg-rose-200 text-rose-800 border border-rose-300 rounded-lg text-xs font-bold transition-colors"
                      >
                        {isUrdu ? 'آرڈر کینسل کریں' : 'Cancel This Order'}
                      </button>
                    )}
                  </div>
                </div>

                {/* Tracking Cancel Dialog */}
                {showCancelPrompt && isCancellable && (
                  <div className="p-3.5 bg-red-50 border-2 border-red-300 rounded-2xl space-y-2">
                    <p className="font-extrabold text-red-950 text-xs">
                      {isUrdu ? 'کیا آپ واقعی یہ آرڈر منسوخ کرنا چاہتے ہیں؟' : 'Confirm Order Cancellation?'}
                    </p>
                    <select
                      value={cancelReason}
                      onChange={(e) => setCancelReason(e.target.value)}
                      className="w-full text-xs p-2 bg-white border border-red-200 rounded-lg outline-none font-medium"
                    >
                      <option value="Ghalat item select ho gaya">{isUrdu ? 'غلط آئٹم سلیکٹ ہو گیا' : 'Ordered wrong item'}</option>
                      <option value="Address change karna hai">{isUrdu ? 'پتے میں تبدیلی کرنی ہے' : 'Change address'}</option>
                      <option value="Delivery timing issue">{isUrdu ? 'ڈیلیوری ٹائمنگ کا مسئلہ ہے' : 'Delivery timing issue'}</option>
                      <option value="Payment problem">{isUrdu ? 'پیمنٹ کا مسئلہ ہے' : 'Payment issue'}</option>
                      <option value="Other reason">{isUrdu ? 'کوئی دوسری وجہ' : 'Other reason'}</option>
                    </select>
                    <div className="flex gap-2 pt-1">
                      <button
                        onClick={handleCancelInTracking}
                        disabled={cancelLoading}
                        className="flex-1 py-1.5 bg-red-700 hover:bg-red-800 text-white rounded-lg font-bold text-xs"
                      >
                        {cancelLoading ? (isUrdu ? 'منسوخ ہو رہا ہے...' : 'Cancelling...') : (isUrdu ? 'ہاں، منسوخ کریں' : 'Yes, Cancel')}
                      </button>
                      <button
                        onClick={() => setShowCancelPrompt(false)}
                        className="px-3 py-1.5 bg-white border border-gray-300 text-gray-700 rounded-lg font-bold text-xs"
                      >
                        {isUrdu ? 'واپس' : 'Back'}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      );
    }
`;

  content = beforeModals + '\n' + newModalsCode + '\n' + afterModals;
  console.log('✅ 4. OrderSuccessModal & OrderTrackingModal updated');
} else {
  console.error('❌ Could not locate modal functions');
}

fs.writeFileSync(filePath, content, 'utf8');
console.log('Finished updating build_luxury_theme.js');
