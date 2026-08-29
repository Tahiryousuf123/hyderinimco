import React, { useEffect } from 'react';
import confetti from 'canvas-confetti';
import {
  CheckCircle, MessageCircle, Printer, Copy,
  Check, ArrowRight, ShieldCheck, Clock, MapPin
} from 'lucide-react';

export default function OrderSuccessModal({ order, isOpen, onClose, settings }) {
  const [copied, setCopied] = React.useState(false);

  useEffect(() => {
    if (isOpen) {
      // Trigger festive confetti
      confetti({
        particleCount: 80,
        spread: 70,
        origin: { y: 0.6 }
      });
    }
  }, [isOpen]);

  if (!isOpen || !order) return null;

  const copyOrderRef = () => {
    navigator.clipboard.writeText(order.orderRef);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handlePrint = () => {
    window.print();
  };

  // Build formatted WhatsApp message
  const generateWhatsAppMessage = () => {
    const itemsList = order.items
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
      `*Sender Name:* ${order.paymentDetails?.senderAccountName}%0A` +
      `*Transaction ID (TID):* ${order.paymentDetails?.transactionId}%0A%0A` +
      `_Please verify payment and dispatch my fresh order!_`;

    return `https://wa.me/${settings?.whatsapp || '923362438422'}?text=${msg}`;
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/75 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
      <div className="relative bg-white rounded-3xl max-w-lg w-full overflow-hidden shadow-2xl border border-emerald-100 animate-in zoom-in-95 duration-200">
        
        {/* Success Header */}
        <div className="bg-gradient-to-br from-emerald-700 via-emerald-800 to-teal-900 text-white p-6 text-center relative">
          <div className="w-16 h-16 rounded-full bg-white text-emerald-700 flex items-center justify-center mx-auto mb-3 shadow-lg shadow-black/20">
            <CheckCircle className="w-10 h-10 stroke-[2.5]" />
          </div>
          <span className="bg-emerald-500/30 text-emerald-200 text-xs font-black uppercase px-3 py-1 rounded-full border border-emerald-400/40">
            Order Submitted & Pre-Paid
          </span>
          <h2 className="text-2xl font-black mt-2">Thank You for Your Order!</h2>
          <p className="text-xs text-emerald-100 mt-1 max-w-sm mx-auto">
            Your fresh frozen order is being logged into our North Nazimabad kitchen queue.
          </p>
        </div>

        {/* Order Details Body */}
        <div className="p-6 space-y-4 max-h-[60vh] overflow-y-auto">
          
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
              <span className="font-bold text-amber-700 flex items-center gap-1 mt-0.5">
                <Clock className="w-3.5 h-3.5" /> Verifying Payment
              </span>
            </div>
            <div className="bg-gray-50 p-3 rounded-xl border border-gray-100">
              <span className="text-gray-400 text-[10px] uppercase font-bold block">Payment TID</span>
              <span className="font-mono font-bold text-gray-800 truncate block mt-0.5">
                {order.paymentDetails?.transactionId || 'Submitted'}
              </span>
            </div>
          </div>

          {/* Itemized Receipt Table */}
          <div className="border border-gray-200 rounded-2xl p-4 bg-gray-50/60 space-y-2 text-xs">
            <h4 className="font-extrabold text-gray-900 border-b border-gray-200 pb-2">
              Itemized Receipt
            </h4>
            <div className="space-y-1.5 max-h-36 overflow-y-auto">
              {order.items.map((it, idx) => (
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
                <span>Total Paid</span>
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
          {/* Send to WhatsApp for Instant Confirmation */}
          <a
            href={generateWhatsAppMessage()}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-xs shadow-lg shadow-emerald-700/20 flex items-center justify-center gap-2 transition-all hover:scale-101"
          >
            <MessageCircle className="w-4 h-4 text-white" />
            <span>Send Receipt to WhatsApp (0336-2438422)</span>
          </a>

          <div className="flex gap-2">
            <button
              onClick={handlePrint}
              className="flex-1 py-2.5 bg-white hover:bg-gray-100 text-gray-700 border border-gray-300 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition-colors"
            >
              <Printer className="w-4 h-4 text-gray-500" />
              <span>Print Invoice</span>
            </button>

            <button
              onClick={onClose}
              className="flex-1 py-2.5 bg-red-800 hover:bg-red-900 text-white rounded-xl font-bold text-xs transition-colors"
            >
              Done / Continue
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
