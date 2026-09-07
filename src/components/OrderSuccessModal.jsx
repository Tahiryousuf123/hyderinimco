import React, { useState, useEffect } from 'react';
import confetti from 'canvas-confetti';
import {
  CheckCircle, MessageCircle, Printer, Copy,
  Check, ArrowRight, ShieldCheck, Clock, MapPin,
  XCircle, AlertTriangle, AlertCircle, RefreshCw, PhoneCall
} from 'lucide-react';

const CANCELLATION_REASONS = [
  "Ghalat item select ho gaya (Ordered wrong item)",
  "Pate / Address mein tabdeeli karni hai (Change address)",
  "Delivery timing ka masla hai (Timing issue)",
  "Raqam / Payment problem",
  "Kahin bahar ja raha hoon (Not available to receive)",
  "Other reason (Koi doosri wajah)"
];

export default function OrderSuccessModal({ order, isOpen, onClose, settings, onCancelOrder }) {
  const [copied, setCopied] = useState(false);
  const [orderStatus, setOrderStatus] = useState(order?.status || 'pending_verification');
  const [showCancelPrompt, setShowCancelPrompt] = useState(false);
  const [selectedReason, setSelectedReason] = useState(CANCELLATION_REASONS[0]);
  const [customReason, setCustomReason] = useState('');
  const [cancelLoading, setCancelLoading] = useState(false);
  const [cancelError, setCancelError] = useState('');
  const [cancelSuccessMsg, setCancelSuccessMsg] = useState('');

  useEffect(() => {
    if (isOpen && order) {
      setOrderStatus(order.status || 'pending_verification');
      setShowCancelPrompt(false);
      setCancelError('');
      setCancelSuccessMsg('');

      // Save active order to localStorage so user can access it anytime
      try {
        localStorage.setItem('hyderi_active_order', JSON.stringify({
          orderRef: order.orderRef,
          id: order.id,
          totalAmount: order.totalAmount,
          customer: order.customer,
          status: order.status || 'pending_verification',
          createdAt: order.createdAt || new Date().toISOString(),
          formattedDate: order.formattedDate || new Date().toLocaleString('en-PK', { timeZone: 'Asia/Karachi' })
        }));
      } catch (e) {}

      // Trigger festive confetti if not cancelled
      if (order.status !== 'cancelled') {
        confetti({
          particleCount: 80,
          spread: 70,
          origin: { y: 0.6 }
        });
      }
    }
  }, [isOpen, order]);

  if (!isOpen || !order) return null;

  const copyOrderRef = () => {
    navigator.clipboard.writeText(order.orderRef);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handlePrint = () => {
    window.print();
  };

  const handleCancelOrder = async () => {
    setCancelLoading(true);
    setCancelError('');
    const finalReason = selectedReason.includes('Other') && customReason.trim()
      ? customReason.trim()
      : selectedReason;

    try {
      const res = await fetch(`/api/orders/${encodeURIComponent(order.orderRef)}/cancel`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: finalReason })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setOrderStatus('cancelled');
        setCancelSuccessMsg('Aapka order kamiyabi se cancel kar diya gaya hai. Confirmation WhatsApp par bhej di gayi hai.');
        setShowCancelPrompt(false);

        // Update localStorage
        try {
          const saved = localStorage.getItem('hyderi_active_order');
          if (saved) {
            const parsed = JSON.parse(saved);
            parsed.status = 'cancelled';
            localStorage.setItem('hyderi_active_order', JSON.stringify(parsed));
          }
        } catch (e) {}

        if (onCancelOrder) {
          onCancelOrder(data.order || { ...order, status: 'cancelled' });
        }
      } else {
        throw new Error(data.message || data.error || 'Failed to cancel order');
      }
    } catch (err) {
      setCancelError(err.message || 'Order cancel karne mein masla pesh aaya. Helpline par rabta karein.');
    } finally {
      setCancelLoading(false);
    }
  };

  // Build formatted WhatsApp message
  const generateWhatsAppMessage = () => {
    const itemsList = (order.items || [])
      .map(i => `• ${i.name} (${i.packQuantity}) x ${i.quantity} = Rs. ${i.price * i.quantity}`)
      .join('%0A');

    const msg = `*NEW HYDERI NIMCO & FROZEN - ONLINE ORDER*%0A%0A` +
      `*Order Ref:* ${order.orderRef}%0A` +
      `*Customer:* ${order.customer?.fullName}%0A` +
      `*Phone:* ${order.customer?.phone}%0A` +
      `*Area:* ${order.customer?.area}%0A` +
      `*Address:* ${order.customer?.address}%0A%0A` +
      `*ITEMS ORDERED:*%0A${itemsList}%0A%0A` +
      `*Subtotal:* Rs. ${order.subtotal}/-%0A` +
      `*Delivery Fee:* Rs. ${order.deliveryFee}/-%0A` +
      `*Total Amount Paid:* Rs. ${order.totalAmount}/-%0A%0A` +
      `*Payment Channel:* ${order.paymentMethod?.toUpperCase()}%0A` +
      `*Sender Name:* ${order.paymentDetails?.senderAccountName || 'N/A'}%0A` +
      `*Transaction ID (TID):* ${order.paymentDetails?.transactionId || 'N/A'}%0A%0A` +
      `_Please verify payment and dispatch my fresh order!_`;

    return `https://wa.me/${settings?.whatsapp || '923362438422'}?text=${msg}`;
  };

  const isCancelled = orderStatus === 'cancelled';
  const isCancellable = orderStatus === 'pending_verification' || orderStatus === 'payment_verified';

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/75 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
      <div className="relative bg-white rounded-3xl max-w-lg w-full overflow-hidden shadow-2xl border border-gray-200 animate-in zoom-in-95 duration-200">
        
        {/* Header - Changes color if cancelled */}
        <div className={`p-6 text-center relative text-white ${
          isCancelled
            ? 'bg-gradient-to-br from-red-700 via-red-800 to-rose-900'
            : 'bg-gradient-to-br from-emerald-700 via-emerald-800 to-teal-900'
        }`}>
          <div className="w-16 h-16 rounded-full bg-white flex items-center justify-center mx-auto mb-3 shadow-lg shadow-black/20">
            {isCancelled ? (
              <XCircle className="w-10 h-10 text-red-600 stroke-[2.5]" />
            ) : (
              <CheckCircle className="w-10 h-10 text-emerald-700 stroke-[2.5]" />
            )}
          </div>
          <span className={`text-xs font-black uppercase px-3 py-1 rounded-full border ${
            isCancelled
              ? 'bg-red-500/30 text-red-200 border-red-400/40'
              : 'bg-emerald-500/30 text-emerald-200 border-emerald-400/40'
          }`}>
            {isCancelled ? 'Order Cancelled' : 'Order Submitted & Logged'}
          </span>
          <h2 className="text-2xl font-black mt-2">
            {isCancelled ? 'Order Has Been Cancelled' : 'Thank You for Your Order!'}
          </h2>
          <p className="text-xs mt-1 max-w-sm mx-auto opacity-90">
            {isCancelled
              ? 'Aapka order cancel kar diya gaya hai. Refund ya mazeed sawal ke liye helpline active hai.'
              : 'Your fresh frozen order has been logged into our North Nazimabad kitchen queue.'}
          </p>
        </div>

        {/* Order Details Body */}
        <div className="p-6 space-y-4 max-h-[60vh] overflow-y-auto">
          
          {/* Cancellation Alert / Confirmation Message */}
          {cancelSuccessMsg && (
            <div className="p-3.5 bg-red-50 border border-red-200 rounded-2xl text-xs text-red-800 flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold">{cancelSuccessMsg}</p>
                <p className="text-[11px] text-red-700 mt-0.5">Helpline: 0336-2438422 | 021-36625698</p>
              </div>
            </div>
          )}

          {/* Order Ref Box */}
          <div className="flex items-center justify-between bg-amber-50 p-3.5 rounded-2xl border border-amber-200">
            <div>
              <span className="text-[10px] text-amber-800 uppercase font-bold tracking-wider">
                Order Tracking Reference
              </span>
              <p className="font-mono font-black text-lg text-gray-900">
                {order.orderRef}
              </p>
            </div>
            <button
              onClick={copyOrderRef}
              className="flex items-center gap-1 bg-white hover:bg-amber-100 text-gray-700 px-3 py-1.5 rounded-xl text-xs font-bold border border-amber-300 transition-colors"
            >
              {copied ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
              <span>{copied ? 'Copied' : 'Copy'}</span>
            </button>
          </div>

          {/* Quick Info Grid */}
          <div className="grid grid-cols-2 gap-2.5 text-xs">
            <div className="bg-gray-50 p-3 rounded-xl border border-gray-100">
              <span className="text-gray-400 text-[10px] uppercase font-bold block">Status</span>
              <span className={`font-bold flex items-center gap-1 mt-0.5 ${
                isCancelled ? 'text-red-700' : 'text-amber-700'
              }`}>
                {isCancelled ? (
                  <XCircle className="w-3.5 h-3.5 text-red-600" />
                ) : (
                  <Clock className="w-3.5 h-3.5 text-amber-600" />
                )}
                {isCancelled ? 'Cancelled' : 'Verifying Payment'}
              </span>
            </div>
            <div className="bg-gray-50 p-3 rounded-xl border border-gray-100">
              <span className="text-gray-400 text-[10px] uppercase font-bold block">Payment TID</span>
              <span className="font-mono font-bold text-gray-800 truncate block mt-0.5">
                {order.paymentDetails?.transactionId || (order.paymentMethod === 'cod' ? 'Cash on Delivery' : 'Submitted')}
              </span>
            </div>
          </div>

          {/* In-Modal Cancel Order Dialog Box */}
          {showCancelPrompt && !isCancelled && (
            <div className="bg-red-50/80 border-2 border-red-300 rounded-2xl p-4 space-y-3 animate-in fade-in zoom-in-95 duration-150">
              <div className="flex items-center gap-2 text-red-900 font-extrabold text-sm">
                <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />
                <span>Kya aap waqai order cancel karna chahte hain?</span>
              </div>
              <p className="text-xs text-red-700">
                Baraye meherbani cancel karne ki wajah muntakhib karein:
              </p>

              <select
                value={selectedReason}
                onChange={(e) => setSelectedReason(e.target.value)}
                className="w-full text-xs p-2.5 bg-white border border-red-200 rounded-xl outline-none text-gray-800 font-medium"
              >
                {CANCELLATION_REASONS.map((r, i) => (
                  <option key={i} value={r}>{r}</option>
                ))}
              </select>

              {selectedReason.includes('Other') && (
                <input
                  type="text"
                  value={customReason}
                  onChange={(e) => setCustomReason(e.target.value)}
                  placeholder="Wajah likhein (Optional)..."
                  className="w-full text-xs p-2.5 bg-white border border-red-200 rounded-xl outline-none text-gray-800"
                />
              )}

              {cancelError && (
                <div className="text-xs text-red-600 font-semibold flex items-center gap-1">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                  <span>{cancelError}</span>
                </div>
              )}

              <div className="flex gap-2 pt-1">
                <button
                  type="button"
                  onClick={handleCancelOrder}
                  disabled={cancelLoading}
                  className="flex-1 py-2.5 bg-red-700 hover:bg-red-800 text-white rounded-xl font-bold text-xs shadow-md transition-all flex items-center justify-center gap-1.5"
                >
                  {cancelLoading ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Cancelling...</span>
                    </>
                  ) : (
                    <>
                      <XCircle className="w-3.5 h-3.5" />
                      <span>Haan, Order Cancel Karein</span>
                    </>
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => setShowCancelPrompt(false)}
                  disabled={cancelLoading}
                  className="px-4 py-2.5 bg-white hover:bg-gray-100 text-gray-700 border border-gray-300 rounded-xl font-bold text-xs transition-colors"
                >
                  Wapis
                </button>
              </div>
            </div>
          )}

          {/* Itemized Receipt Table */}
          <div className="border border-gray-200 rounded-2xl p-4 bg-gray-50/60 space-y-2 text-xs">
            <h4 className="font-extrabold text-gray-900 border-b border-gray-200 pb-2 flex justify-between">
              <span>Itemized Receipt</span>
              <span className="text-gray-500 font-normal">{(order.items || []).length} items</span>
            </h4>
            <div className="space-y-1.5 max-h-36 overflow-y-auto">
              {(order.items || []).map((it, idx) => (
                <div key={idx} className="flex justify-between text-gray-700">
                  <span>
                    <b>{it.quantity}x</b> {it.name} <span className="text-gray-400">({it.packQuantity})</span>
                  </span>
                  <span className="font-semibold text-gray-900">Rs. {it.price * it.quantity}/-</span>
                </div>
              ))}
            </div>

            <div className="border-t border-gray-200 pt-2 space-y-1 text-xs">
              <div className="flex justify-between text-gray-600">
                <span>Subtotal</span>
                <span>Rs. {order.subtotal}/-</span>
              </div>
              <div className="flex justify-between text-gray-600">
                <span>Delivery Charge</span>
                <span>{order.deliveryFee === 0 ? 'FREE' : `Rs. ${order.deliveryFee}/-`}</span>
              </div>
              <div className="flex justify-between font-black text-sm text-red-900 pt-1 border-t border-gray-200">
                <span>Total {isCancelled ? 'Amount (Cancelled)' : 'Paid'}</span>
                <span>Rs. {order.totalAmount}/-</span>
              </div>
            </div>
          </div>

          {/* Customer Address Note */}
          <div className="text-xs text-gray-600 bg-gray-50 p-3 rounded-xl border border-gray-200 flex items-start gap-2">
            <MapPin className="w-4 h-4 text-red-700 shrink-0 mt-0.5" />
            <div>
              <span className="font-bold text-gray-900">Delivery To: </span>
              <span>{order.customer?.fullName}, {order.customer?.address}, {order.customer?.area} ({order.customer?.phone})</span>
            </div>
          </div>

        </div>

        {/* Action Buttons */}
        <div className="p-4 sm:p-5 border-t border-gray-200 bg-gray-50 space-y-2.5">
          {!isCancelled && (
            <a
              href={generateWhatsAppMessage()}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-xs shadow-lg shadow-emerald-700/20 flex items-center justify-center gap-2 transition-all hover:scale-101"
            >
              <MessageCircle className="w-4 h-4 text-white" />
              <span>Send Receipt to WhatsApp ({settings?.phone1 || '0336-2438422'})</span>
            </a>
          )}

          <div className="flex gap-2">
            <button
              onClick={handlePrint}
              className="flex-1 py-2.5 bg-white hover:bg-gray-100 text-gray-700 border border-gray-300 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition-colors"
            >
              <Printer className="w-4 h-4 text-gray-500" />
              <span>Print Slip</span>
            </button>

            {/* Cancel Order Button */}
            {!isCancelled && isCancellable && !showCancelPrompt && (
              <button
                type="button"
                onClick={() => setShowCancelPrompt(true)}
                className="flex-1 py-2.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-300 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition-colors"
              >
                <XCircle className="w-4 h-4 text-rose-600" />
                <span>Cancel Order</span>
              </button>
            )}

            <button
              onClick={onClose}
              className="flex-1 py-2.5 bg-red-800 hover:bg-red-900 text-white rounded-xl font-bold text-xs transition-colors text-center"
            >
              {isCancelled ? 'Close' : 'Done / Continue'}
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
