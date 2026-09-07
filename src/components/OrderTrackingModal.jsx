import React, { useState } from 'react';
import {
  X, Search, CheckCircle2, Clock, Truck, Package,
  AlertCircle, XCircle, AlertTriangle, RefreshCw
} from 'lucide-react';

const CANCELLATION_REASONS = [
  "Ghalat item select ho gaya (Ordered wrong item)",
  "Pate / Address mein tabdeeli karni hai (Change address)",
  "Delivery timing ka masla hai (Timing issue)",
  "Raqam / Payment problem",
  "Kahin bahar ja raha hoon (Not available to receive)",
  "Other reason (Koi doosri wajah)"
];

export default function OrderTrackingModal({ isOpen, onClose }) {
  const [orderRef, setOrderRef] = useState('');
  const [loading, setLoading] = useState(false);
  const [searchedOrder, setSearchedOrder] = useState(null);
  const [errorMsg, setErrorMsg] = useState('');
  const [showCancelPrompt, setShowCancelPrompt] = useState(false);
  const [cancelReason, setCancelReason] = useState(CANCELLATION_REASONS[0]);
  const [customReason, setCustomReason] = useState('');
  const [cancelLoading, setCancelLoading] = useState(false);
  const [cancelMsg, setCancelMsg] = useState('');

  if (!isOpen) return null;

  const handleTrack = async (e) => {
    if (e) e.preventDefault();
    if (!orderRef.trim()) return;

    setLoading(true);
    setErrorMsg('');
    setCancelMsg('');
    setShowCancelPrompt(false);
    setSearchedOrder(null);

    try {
      const res = await fetch(`/api/orders/${encodeURIComponent(orderRef.trim())}`);
      const data = await res.json();
      if (data.success && data.order) {
        setSearchedOrder(data.order);
      } else {
        setErrorMsg(data.message || 'Order reference not found. Please verify your reference number.');
      }
    } catch (err) {
      setErrorMsg('Could not connect to tracking server. Please check your reference or contact us on WhatsApp.');
    } finally {
      setLoading(false);
    }
  };

  const handleCancelOrder = async () => {
    if (!searchedOrder) return;
    setCancelLoading(true);
    setErrorMsg('');
    const finalReason = cancelReason.includes('Other') && customReason.trim()
      ? customReason.trim()
      : cancelReason;

    try {
      const res = await fetch(`/api/orders/${encodeURIComponent(searchedOrder.orderRef)}/cancel`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: finalReason })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setSearchedOrder(prev => ({ ...prev, status: 'cancelled', cancellationReason: finalReason }));
        setCancelMsg('Order kamiyabi se cancel ho gaya hai. Confirmation WhatsApp par bhej di gayi hai.');
        setShowCancelPrompt(false);

        // Update localStorage
        try {
          const saved = localStorage.getItem('hyderi_active_order');
          if (saved) {
            const parsed = JSON.parse(saved);
            if (parsed.orderRef === searchedOrder.orderRef) {
              parsed.status = 'cancelled';
              localStorage.setItem('hyderi_active_order', JSON.stringify(parsed));
            }
          }
        } catch (e) {}
      } else {
        throw new Error(data.message || 'Failed to cancel order');
      }
    } catch (err) {
      setErrorMsg(err.message || 'Cancellation failed. Please call hotline: 0336-2438422.');
    } finally {
      setCancelLoading(false);
    }
  };

  const getStatusStep = (status) => {
    switch (status) {
      case 'pending_verification': return 1;
      case 'payment_verified': return 2;
      case 'preparing': return 3;
      case 'out_for_delivery': return 4;
      case 'completed': return 5;
      default: return 1;
    }
  };

  const isCancelled = searchedOrder?.status === 'cancelled';
  const isCancellable = searchedOrder?.status === 'pending_verification' || searchedOrder?.status === 'payment_verified';
  const currentStep = searchedOrder ? getStatusStep(searchedOrder.status) : 1;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/70 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="relative bg-white rounded-t-3xl sm:rounded-3xl max-w-lg w-full overflow-hidden shadow-2xl border-t sm:border border-gray-200 animate-in slide-in-from-bottom sm:zoom-in-95 duration-200 max-h-[90vh] flex flex-col">
        {/* Mobile Drag Indicator */}
        <div className="w-12 h-1 bg-gray-300 rounded-full mx-auto my-2 sm:hidden shrink-0" />
        
        {/* Header */}
        <div className="p-5 border-b border-gray-100 bg-amber-50/70 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-red-800 text-white flex items-center justify-center">
              <Truck className="w-5 h-5 text-amber-300" />
            </div>
            <div>
              <h3 className="font-extrabold text-gray-900 text-base">Track Your Order</h3>
              <p className="text-xs text-gray-500">Hyderi Nimco & Frozen Express Dispatch</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white text-gray-500 hover:text-gray-900 flex items-center justify-center border border-gray-200"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-5">
          {/* Search Bar */}
          <form onSubmit={handleTrack} className="flex gap-2">
            <input
              type="text"
              value={orderRef}
              onChange={(e) => setOrderRef(e.target.value.toUpperCase())}
              placeholder="Enter Order Ref (e.g. HYD-123456)"
              className="flex-1 px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm font-mono focus:bg-white focus:border-red-600 outline-none uppercase"
            />
            <button
              type="submit"
              disabled={loading}
              className="px-5 py-2.5 bg-red-800 hover:bg-red-900 text-white rounded-xl text-xs font-bold transition-all shadow-md shrink-0"
            >
              {loading ? 'Searching...' : 'Track'}
            </button>
          </form>

          {/* Messages */}
          {errorMsg && (
            <div className="p-3 rounded-xl bg-red-50 text-red-700 text-xs flex items-center gap-2 border border-red-200">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {cancelMsg && (
            <div className="p-3 rounded-xl bg-red-50 text-red-800 text-xs flex items-center gap-2 border border-red-200">
              <CheckCircle2 className="w-4 h-4 text-red-600 shrink-0" />
              <span className="font-semibold">{cancelMsg}</span>
            </div>
          )}

          {/* Order Status Display */}
          {searchedOrder && (
            <div className="space-y-4 pt-2">
              {/* Foodpanda Style: Out For Delivery Notice in Tracking */}
              {searchedOrder.status === 'out_for_delivery' && (
                <div className="p-3.5 bg-amber-50 border-2 border-amber-400 rounded-2xl flex items-center gap-3 text-xs text-amber-950 font-bold shadow-sm">
                  <span className="text-2xl animate-bounce">🛵</span>
                  <div>
                    <p className="font-extrabold text-amber-950">Order is Out for Delivery!</p>
                    <p className="text-[11px] font-normal text-amber-800 mt-0.5">
                      Rider aapka parcel le kar nikal chuka hai, is liye ab cancel karne ka option band hai. Helpline: 0336-2438422
                    </p>
                  </div>
                </div>
              )}

              {/* Order Quick Summary */}
              <div className="bg-amber-50/80 p-4 rounded-2xl border border-amber-200 text-xs space-y-1">
                <div className="flex justify-between items-center">
                  <span className="font-bold text-gray-900">Order: {searchedOrder.orderRef}</span>
                  <span className={`font-bold px-2 py-0.5 rounded text-[10px] text-white ${
                    isCancelled ? 'bg-red-700' : 'bg-red-800'
                  }`}>
                    Rs. {searchedOrder.totalAmount}/-
                  </span>
                </div>
                <p className="text-gray-600">Placed on: {searchedOrder.formattedDate}</p>
                <p className="text-gray-600">Customer: {searchedOrder.customer?.fullName} ({searchedOrder.customer?.area})</p>
                <div className="pt-1 flex items-center justify-between">
                  <span className={`inline-flex items-center gap-1 font-bold text-xs ${
                    isCancelled ? 'text-red-700' : 'text-emerald-700'
                  }`}>
                    {isCancelled ? <XCircle className="w-3.5 h-3.5 text-red-600" /> : <Clock className="w-3.5 h-3.5" />}
                    Status: {isCancelled ? 'Cancelled' : searchedOrder.status?.replace(/_/g, ' ')}
                  </span>
                  
                  {isCancellable && !showCancelPrompt && (
                    <button
                      type="button"
                      onClick={() => setShowCancelPrompt(true)}
                      className="px-3 py-1 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-300 rounded-lg text-[11px] font-bold transition-colors"
                    >
                      Cancel This Order
                    </button>
                  )}
                </div>
              </div>

              {/* Cancellation Confirmation Dialog */}
              {showCancelPrompt && isCancellable && (
                <div className="bg-red-50/90 border-2 border-red-300 rounded-2xl p-4 space-y-3 animate-in fade-in zoom-in-95 duration-150">
                  <div className="flex items-center gap-2 text-red-900 font-extrabold text-sm">
                    <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />
                    <span>Order Cancellation Confirmation</span>
                  </div>
                  <p className="text-xs text-red-700">
                    Kiya aap waqai is order ko cancel karna chahte hain? Wajah muntakhib karein:
                  </p>

                  <select
                    value={cancelReason}
                    onChange={(e) => setCancelReason(e.target.value)}
                    className="w-full text-xs p-2.5 bg-white border border-red-200 rounded-xl outline-none text-gray-800 font-medium"
                  >
                    {CANCELLATION_REASONS.map((r, i) => (
                      <option key={i} value={r}>{r}</option>
                    ))}
                  </select>

                  {cancelReason.includes('Other') && (
                    <input
                      type="text"
                      value={customReason}
                      onChange={(e) => setCustomReason(e.target.value)}
                      placeholder="Wajah likhein (Optional)..."
                      className="w-full text-xs p-2.5 bg-white border border-red-200 rounded-xl outline-none text-gray-800"
                    />
                  )}

                  <div className="flex gap-2 pt-1">
                    <button
                      type="button"
                      onClick={handleCancelOrder}
                      disabled={cancelLoading}
                      className="flex-1 py-2 bg-red-700 hover:bg-red-800 text-white rounded-xl font-bold text-xs shadow-md transition-all flex items-center justify-center gap-1.5"
                    >
                      {cancelLoading ? (
                        <>
                          <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                          <span>Cancelling...</span>
                        </>
                      ) : (
                        <span>Haan, Cancel Karein</span>
                      )}
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowCancelPrompt(false)}
                      disabled={cancelLoading}
                      className="px-4 py-2 bg-white hover:bg-gray-100 text-gray-700 border border-gray-300 rounded-xl font-bold text-xs transition-colors"
                    >
                      Wapis
                    </button>
                  </div>
                </div>
              )}

              {/* Progress Timeline or Cancelled State */}
              {isCancelled ? (
                <div className="p-4 rounded-2xl bg-red-50 border border-red-200 text-xs text-red-900 space-y-1 text-center">
                  <XCircle className="w-8 h-8 text-red-600 mx-auto" />
                  <p className="font-extrabold text-sm">This Order Is Cancelled</p>
                  <p className="text-red-700 text-[11px]">
                    {searchedOrder.cancellationReason
                      ? `Reason: ${searchedOrder.cancellationReason}`
                      : 'Yeh order customer ki darkhwast par cancel kiya gaya hai.'}
                  </p>
                  <p className="text-gray-500 text-[10px] pt-1">
                    Kisi bhi sawal ya payment refund ke liye helpline par call karein: 0336-2438422
                  </p>
                </div>
              ) : (
                <div className="space-y-3 pl-2 text-xs">
                  <div className="flex items-start gap-3">
                    <div className={`w-6 h-6 rounded-full flex items-center justify-center text-white shrink-0 ${currentStep >= 1 ? 'bg-emerald-600' : 'bg-gray-300'}`}>
                      <CheckCircle2 className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="font-bold text-gray-900">Order Placed & Pre-Paid</p>
                      <p className="text-gray-500 text-[11px]">TID: {searchedOrder.paymentDetails?.transactionId || 'Confirmed'}</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <div className={`w-6 h-6 rounded-full flex items-center justify-center text-white shrink-0 ${currentStep >= 2 ? 'bg-emerald-600' : 'bg-gray-300'}`}>
                      <Clock className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="font-bold text-gray-900">Payment Verification</p>
                      <p className="text-gray-500 text-[11px]">Accounts team verifies bank transfer</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <div className={`w-6 h-6 rounded-full flex items-center justify-center text-white shrink-0 ${currentStep >= 3 ? 'bg-emerald-600' : 'bg-gray-300'}`}>
                      <Package className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="font-bold text-gray-900">Chilled Packing</p>
                      <p className="text-gray-500 text-[11px]">Items packed with insulated cold protection</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <div className={`w-6 h-6 rounded-full flex items-center justify-center text-white shrink-0 ${currentStep >= 4 ? 'bg-emerald-600' : 'bg-gray-300'}`}>
                      <Truck className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="font-bold text-gray-900">Out for Delivery</p>
                      <p className="text-gray-500 text-[11px]">Rider en route to {searchedOrder.customer?.area}</p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
