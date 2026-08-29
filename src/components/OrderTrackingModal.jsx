import React, { useState } from 'react';
import { X, Search, CheckCircle2, Clock, Truck, Package, AlertCircle } from 'lucide-react';

export default function OrderTrackingModal({ isOpen, onClose }) {
  const [orderRef, setOrderRef] = useState('');
  const [loading, setLoading] = useState(false);
  const [searchedOrder, setSearchedOrder] = useState(null);
  const [errorMsg, setErrorMsg] = useState('');

  if (!isOpen) return null;

  const handleTrack = async (e) => {
    e.preventDefault();
    if (!orderRef.trim()) return;

    setLoading(true);
    setErrorMsg('');
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

  const currentStep = searchedOrder ? getStatusStep(searchedOrder.status) : 1;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="relative bg-white rounded-3xl max-w-lg w-full overflow-hidden shadow-2xl border border-gray-200 animate-in zoom-in-95 duration-200">
        
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

          {/* Error */}
          {errorMsg && (
            <div className="p-3 rounded-xl bg-red-50 text-red-700 text-xs flex items-center gap-2 border border-red-200">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Order Status Display */}
          {searchedOrder && (
            <div className="space-y-4 pt-2">
              {/* Order Quick Summary */}
              <div className="bg-amber-50/80 p-4 rounded-2xl border border-amber-200 text-xs space-y-1">
                <div className="flex justify-between items-center">
                  <span className="font-bold text-gray-900">Order: {searchedOrder.orderRef}</span>
                  <span className="bg-red-800 text-white font-bold px-2 py-0.5 rounded text-[10px]">
                    Rs. {searchedOrder.totalAmount}/-
                  </span>
                </div>
                <p className="text-gray-600">Placed on: {searchedOrder.formattedDate}</p>
                <p className="text-gray-600">Customer: {searchedOrder.customer?.fullName} ({searchedOrder.customer?.area})</p>
              </div>

              {/* Progress Timeline */}
              <div className="space-y-3 pl-2 text-xs">
                <div className="flex items-start gap-3">
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center text-white shrink-0 ${currentStep >= 1 ? 'bg-emerald-600' : 'bg-gray-300'}`}>
                    <CheckCircle2 className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="font-bold text-gray-900">Order Placed & Pre-Paid</p>
                    <p className="text-gray-500 text-[11px]">TID: {searchedOrder.paymentDetails?.transactionId}</p>
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
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
