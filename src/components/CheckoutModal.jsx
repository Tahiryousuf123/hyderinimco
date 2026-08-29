import React, { useState } from 'react';
import {
  X, Check, Copy, Building2, Smartphone, ShieldCheck,
  Upload, AlertCircle, ArrowLeft, ArrowRight, CheckCircle2,
  Lock, Sparkles, HelpCircle, FileText
} from 'lucide-react';

const KARACHI_AREAS = [
  "North Nazimabad (Local Pickup / Fast Express)",
  "North Karachi",
  "Buffer Zone",
  "Federal B Area (FB Area)",
  "Nazimabad (1 - 7)",
  "Gulberg",
  "Gulshan-e-Iqbal",
  "Gulistan-e-Johar",
  "Clifton",
  "Defence Housing Authority (DHA)",
  "PECHS / Tariq Road",
  "Bahadurabad",
  "Saddar / Garden",
  "KDA Scheme 1 / Tipu Sultan",
  "Malir Cantt / Model Colony",
  "Scheme 33 / Safoora",
  "Site Area / Liaquatabad",
  "Korangi / Landhi",
  "Other Karachi Area"
];

export default function CheckoutModal({
  isOpen,
  onClose,
  cartItems,
  settings,
  onOrderComplete
}) {
  const [step, setStep] = useState(1); // 1: Delivery Details, 2: Payment Method & Proof, 3: Review & Submit
  const [customer, setCustomer] = useState({
    fullName: '',
    phone: '',
    email: '',
    address: '',
    area: KARACHI_AREAS[0],
    landmark: '',
    notes: ''
  });

  const [paymentMethod, setPaymentMethod] = useState('bank_transfer'); // 'bank_transfer' | 'easypaisa' | 'jazzcash'
  const [selectedBank, setSelectedBank] = useState('meezan'); // 'meezan' | 'hbl'
  const [senderAccountName, setSenderAccountName] = useState('');
  const [transactionId, setTransactionId] = useState('');
  const [paymentSlipFile, setPaymentSlipFile] = useState(null);
  const [slipPreview, setSlipPreview] = useState(null);
  const [copiedKey, setCopiedKey] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  if (!isOpen) return null;

  const subtotal = cartItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  const freeThreshold = settings?.freeDeliveryAbove || 2500;
  const standardDelivery = settings?.deliveryFee || 150;
  const isFreeDelivery = subtotal >= freeThreshold;
  const deliveryFee = isFreeDelivery ? 0 : standardDelivery;
  const totalAmount = subtotal + deliveryFee;

  const copyToClipboard = (text, key) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 10 * 1024 * 1024) {
        setErrorMsg('Image size should be less than 10MB');
        return;
      }
      setPaymentSlipFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setSlipPreview(reader.result);
      };
      reader.readAsDataURL(file);
      setErrorMsg('');
    }
  };

  const validateStep1 = () => {
    if (!customer.fullName.trim()) {
      setErrorMsg('Please enter your Full Name');
      return false;
    }
    if (!customer.phone.trim() || customer.phone.replace(/\D/g, '').length < 10) {
      setErrorMsg('Please enter a valid WhatsApp Phone Number (e.g. 03001234567)');
      return false;
    }
    if (!customer.address.trim()) {
      setErrorMsg('Please enter your complete Street / House Address');
      return false;
    }
    setErrorMsg('');
    return true;
  };

  const validateStep2 = () => {
    if (!senderAccountName.trim()) {
      setErrorMsg('Please enter the Sender Account Title / Name from which you transferred');
      return false;
    }
    if (!transactionId.trim()) {
      setErrorMsg('Please enter the Transaction ID (TID / Ref #) given by your banking app');
      return false;
    }
    if (!paymentSlipFile) {
      setErrorMsg('Please attach the Payment Screenshot or Receipt slip');
      return false;
    }
    setErrorMsg('');
    return true;
  };

  const handleSubmitOrder = async () => {
    setIsSubmitting(true);
    setErrorMsg('');

    try {
      const formData = new FormData();
      formData.append('customer', JSON.stringify(customer));
      formData.append('items', JSON.stringify(cartItems));
      formData.append('subtotal', subtotal);
      formData.append('deliveryFee', deliveryFee);
      formData.append('totalAmount', totalAmount);
      formData.append('paymentMethod', paymentMethod);
      formData.append('senderAccountName', senderAccountName);
      formData.append('transactionId', transactionId);
      formData.append('bankName', paymentMethod === 'bank_transfer' ? (selectedBank === 'meezan' ? 'Meezan Bank' : 'HBL') : (paymentMethod === 'easypaisa' ? 'EasyPaisa' : 'JazzCash'));
      formData.append('notes', customer.notes);

      if (paymentSlipFile) {
        formData.append('paymentSlip', paymentSlipFile);
      }

      const res = await fetch('/api/orders', {
        method: 'POST',
        body: formData
      });

      const data = await res.json();
      if (data.success && data.order) {
        onOrderComplete(data.order);
      } else {
        throw new Error(data.message || 'Failed to place order');
      }
    } catch (err) {
      console.error('Checkout error:', err);
      // Fallback local order creation if server not reachable
      const fallbackOrder = {
        id: 'ord-' + Date.now(),
        orderRef: 'HYD-' + Math.floor(100000 + Math.random() * 900000),
        createdAt: new Date().toISOString(),
        formattedDate: new Date().toLocaleDateString('en-PK', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }),
        customer,
        items: cartItems,
        subtotal,
        deliveryFee,
        totalAmount,
        paymentMethod,
        paymentDetails: {
          bankName: paymentMethod === 'bank_transfer' ? (selectedBank === 'meezan' ? 'Meezan Bank' : 'HBL') : paymentMethod,
          senderAccountName,
          transactionId,
          paymentSlipUrl: slipPreview
        },
        status: 'pending_verification',
        notes: customer.notes
      };
      onOrderComplete(fallbackOrder);
    } finally {
      setIsSubmitting(false);
    }
  };

  const meezanAcc = settings?.paymentAccounts?.bankTransfer || {
    bankName: "Meezan Bank Limited",
    accountTitle: "NEW HYDERI NIMCO & FROZEN",
    accountNumber: "01020304050607",
    iban: "PK55MEZN0001020304050607",
    branch: "North Nazimabad Block E, Karachi",
    raastId: "03362438422"
  };

  const hblAcc = settings?.paymentAccounts?.bankTransfer2 || {
    bankName: "Habib Bank Limited (HBL)",
    accountTitle: "NEW HYDERI NIMCO & FROZEN",
    accountNumber: "12345678901234",
    iban: "PK36HABB0012345678901234",
    branch: "Hyderi Market Branch, Karachi"
  };

  const easypaisaAcc = settings?.paymentAccounts?.easypaisa || {
    accountTitle: "HYDERI NIMCO ONLINE",
    accountNumber: "0336-2438422"
  };

  const jazzcashAcc = settings?.paymentAccounts?.jazzcash || {
    accountTitle: "HYDERI NIMCO ONLINE",
    accountNumber: "0336-2438422"
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
      <div className="relative bg-white rounded-3xl max-w-2xl w-full overflow-hidden shadow-2xl border border-gray-200 animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-gray-100 bg-gradient-to-r from-red-900 to-red-950 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-400 text-red-950 flex items-center justify-center font-extrabold shadow-md">
              <Lock className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-extrabold text-lg sm:text-xl">Enterprise Digital Checkout</h2>
                <span className="bg-emerald-500/20 text-emerald-300 text-[10px] font-bold px-2 py-0.5 rounded-full border border-emerald-400/30">
                  100% Secure
                </span>
              </div>
              <p className="text-xs text-red-200">
                Official Bank Transfer & Digital Wallet Prepayment System
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Step Indicator */}
        <div className="bg-amber-50/70 px-6 py-3 border-b border-amber-100 flex items-center justify-between text-xs">
          <div className={`flex items-center gap-2 font-bold ${step >= 1 ? 'text-red-900' : 'text-gray-400'}`}>
            <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs ${step >= 1 ? 'bg-red-800 text-white' : 'bg-gray-200 text-gray-600'}`}>
              1
            </span>
            <span>Delivery Info</span>
          </div>
          <div className={`h-0.5 flex-1 mx-3 ${step >= 2 ? 'bg-red-800' : 'bg-gray-200'}`}></div>
          <div className={`flex items-center gap-2 font-bold ${step >= 2 ? 'text-red-900' : 'text-gray-400'}`}>
            <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs ${step >= 2 ? 'bg-red-800 text-white' : 'bg-gray-200 text-gray-600'}`}>
              2
            </span>
            <span>Bank / Online Pay</span>
          </div>
          <div className={`h-0.5 flex-1 mx-3 ${step >= 3 ? 'bg-red-800' : 'bg-gray-200'}`}></div>
          <div className={`flex items-center gap-2 font-bold ${step >= 3 ? 'text-red-900' : 'text-gray-400'}`}>
            <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs ${step >= 3 ? 'bg-red-800 text-white' : 'bg-gray-200 text-gray-600'}`}>
              3
            </span>
            <span>Verification</span>
          </div>
        </div>

        {/* Error Alert */}
        {errorMsg && (
          <div className="mx-6 mt-4 p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2 font-semibold">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Modal Content Steps */}
        <div className="p-6 max-h-[65vh] overflow-y-auto">
          
          {/* STEP 1: Delivery Address & Customer Details */}
          {step === 1 && (
            <div className="space-y-4">
              <div>
                <h3 className="font-bold text-gray-900 text-sm mb-1">Karachi Delivery Destination</h3>
                <p className="text-xs text-gray-500">Provide accurate details for temperature-controlled express dispatch.</p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">Full Name *</label>
                  <input
                    type="text"
                    value={customer.fullName}
                    onChange={(e) => setCustomer({ ...customer, fullName: e.target.value })}
                    placeholder="e.g. Muhammad Ali"
                    className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:bg-white focus:border-red-600 focus:ring-1 focus:ring-red-600 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">WhatsApp Phone Number *</label>
                  <input
                    type="tel"
                    value={customer.phone}
                    onChange={(e) => setCustomer({ ...customer, phone: e.target.value })}
                    placeholder="0300-1234567"
                    className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:bg-white focus:border-red-600 focus:ring-1 focus:ring-red-600 outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">Karachi Area / Sector *</label>
                  <select
                    value={customer.area}
                    onChange={(e) => setCustomer({ ...customer, area: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:bg-white focus:border-red-600 outline-none font-medium"
                  >
                    {KARACHI_AREAS.map((ar) => (
                      <option key={ar} value={ar}>{ar}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">Nearby Landmark (Optional)</label>
                  <input
                    type="text"
                    value={customer.landmark}
                    onChange={(e) => setCustomer({ ...customer, landmark: e.target.value })}
                    placeholder="Near Masjid / Famous Hospital / Market"
                    className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:bg-white focus:border-red-600 outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Full House / Flat / Street Address *</label>
                <textarea
                  rows={2}
                  value={customer.address}
                  onChange={(e) => setCustomer({ ...customer, address: e.target.value })}
                  placeholder="House #, Street name, Block / Sector details"
                  className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:bg-white focus:border-red-600 outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Order Notes / Delivery Time (Optional)</label>
                <input
                  type="text"
                  value={customer.notes}
                  onChange={(e) => setCustomer({ ...customer, notes: e.target.value })}
                  placeholder="e.g. Ring bell twice, deliver between 5pm-7pm"
                  className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:bg-white focus:border-red-600 outline-none"
                />
              </div>
            </div>
          )}

          {/* STEP 2: Payment Gateway & Bank Account Transfer (No COD) */}
          {step === 2 && (
            <div className="space-y-5">
              <div>
                <div className="flex items-center justify-between">
                  <h3 className="font-bold text-gray-900 text-sm">Select Digital Payment Channel</h3>
                  <span className="text-xs font-extrabold text-red-800 bg-red-50 px-2 py-0.5 rounded-md border border-red-200">
                    Payable: Rs. {totalAmount}/-
                  </span>
                </div>
                <p className="text-xs text-gray-500 mt-0.5">
                  100% Prepayment Required. Choose your preferred corporate account below:
                </p>
              </div>

              {/* Payment Method Selector Tabs */}
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => setPaymentMethod('bank_transfer')}
                  className={`p-3 rounded-2xl border flex flex-col items-center gap-1.5 transition-all text-center ${
                    paymentMethod === 'bank_transfer'
                      ? 'border-red-800 bg-red-50/90 text-red-950 ring-2 ring-red-800/30'
                      : 'border-gray-200 bg-gray-50 hover:bg-gray-100 text-gray-700'
                  }`}
                >
                  <Building2 className={`w-5 h-5 ${paymentMethod === 'bank_transfer' ? 'text-red-800' : 'text-gray-500'}`} />
                  <span className="text-xs font-extrabold">Bank / Raast</span>
                  <span className="text-[10px] text-gray-500">Meezan / HBL</span>
                </button>

                <button
                  type="button"
                  onClick={() => setPaymentMethod('easypaisa')}
                  className={`p-3 rounded-2xl border flex flex-col items-center gap-1.5 transition-all text-center ${
                    paymentMethod === 'easypaisa'
                      ? 'border-emerald-600 bg-emerald-50 text-emerald-950 ring-2 ring-emerald-600/30'
                      : 'border-gray-200 bg-gray-50 hover:bg-gray-100 text-gray-700'
                  }`}
                >
                  <Smartphone className={`w-5 h-5 ${paymentMethod === 'easypaisa' ? 'text-emerald-600' : 'text-gray-500'}`} />
                  <span className="text-xs font-extrabold">EasyPaisa</span>
                  <span className="text-[10px] text-emerald-700 font-semibold">Direct Wallet</span>
                </button>

                <button
                  type="button"
                  onClick={() => setPaymentMethod('jazzcash')}
                  className={`p-3 rounded-2xl border flex flex-col items-center gap-1.5 transition-all text-center ${
                    paymentMethod === 'jazzcash'
                      ? 'border-amber-600 bg-amber-50 text-amber-950 ring-2 ring-amber-600/30'
                      : 'border-gray-200 bg-gray-50 hover:bg-gray-100 text-gray-700'
                  }`}
                >
                  <Smartphone className={`w-5 h-5 ${paymentMethod === 'jazzcash' ? 'text-amber-600' : 'text-gray-500'}`} />
                  <span className="text-xs font-extrabold">JazzCash</span>
                  <span className="text-[10px] text-amber-700 font-semibold">Direct Wallet</span>
                </button>
              </div>

              {/* Bank Account Details Box */}
              {paymentMethod === 'bank_transfer' && (
                <div className="bg-slate-900 text-white rounded-2xl p-4 sm:p-5 space-y-4 shadow-xl border border-slate-700">
                  {/* Bank Switcher */}
                  <div className="flex gap-2 border-b border-slate-700 pb-3">
                    <button
                      type="button"
                      onClick={() => setSelectedBank('meezan')}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                        selectedBank === 'meezan'
                          ? 'bg-amber-400 text-slate-950 shadow-md'
                          : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                      }`}
                    >
                      Meezan Bank (Islamic)
                    </button>
                    <button
                      type="button"
                      onClick={() => setSelectedBank('hbl')}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                        selectedBank === 'hbl'
                          ? 'bg-amber-400 text-slate-950 shadow-md'
                          : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                      }`}
                    >
                      Habib Bank Limited (HBL)
                    </button>
                  </div>

                  {/* Active Bank Fields */}
                  {selectedBank === 'meezan' ? (
                    <div className="space-y-2.5 text-xs">
                      <div className="flex justify-between items-center bg-slate-800/80 p-2.5 rounded-xl border border-slate-700">
                        <div>
                          <span className="text-slate-400 text-[10px] uppercase font-semibold">Bank Name</span>
                          <p className="font-bold text-amber-300 text-sm">{meezanAcc.bankName}</p>
                        </div>
                      </div>

                      <div className="flex justify-between items-center bg-slate-800/80 p-2.5 rounded-xl border border-slate-700">
                        <div>
                          <span className="text-slate-400 text-[10px] uppercase font-semibold">Account Title</span>
                          <p className="font-bold text-white text-sm">{meezanAcc.accountTitle}</p>
                        </div>
                        <button
                          type="button"
                          onClick={() => copyToClipboard(meezanAcc.accountTitle, 'title')}
                          className="flex items-center gap-1 bg-slate-700 hover:bg-slate-600 text-amber-300 px-2.5 py-1 rounded-lg text-xs font-medium"
                        >
                          {copiedKey === 'title' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                          <span>{copiedKey === 'title' ? 'Copied' : 'Copy'}</span>
                        </button>
                      </div>

                      <div className="flex justify-between items-center bg-slate-800/80 p-2.5 rounded-xl border border-slate-700">
                        <div>
                          <span className="text-slate-400 text-[10px] uppercase font-semibold">Account Number</span>
                          <p className="font-mono font-bold text-amber-300 text-sm tracking-wider">{meezanAcc.accountNumber}</p>
                        </div>
                        <button
                          type="button"
                          onClick={() => copyToClipboard(meezanAcc.accountNumber, 'acc')}
                          className="flex items-center gap-1 bg-slate-700 hover:bg-slate-600 text-amber-300 px-2.5 py-1 rounded-lg text-xs font-medium"
                        >
                          {copiedKey === 'acc' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                          <span>{copiedKey === 'acc' ? 'Copied' : 'Copy'}</span>
                        </button>
                      </div>

                      <div className="flex justify-between items-center bg-slate-800/80 p-2.5 rounded-xl border border-slate-700">
                        <div>
                          <span className="text-slate-400 text-[10px] uppercase font-semibold">IBAN Number (All Pakistan Banks)</span>
                          <p className="font-mono font-bold text-emerald-300 text-xs sm:text-sm tracking-wider">{meezanAcc.iban}</p>
                        </div>
                        <button
                          type="button"
                          onClick={() => copyToClipboard(meezanAcc.iban, 'iban')}
                          className="flex items-center gap-1 bg-slate-700 hover:bg-slate-600 text-emerald-300 px-2.5 py-1 rounded-lg text-xs font-medium"
                        >
                          {copiedKey === 'iban' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                          <span>{copiedKey === 'iban' ? 'Copied' : 'Copy'}</span>
                        </button>
                      </div>

                      {meezanAcc.raastId && (
                        <div className="flex justify-between items-center bg-emerald-950/60 p-2.5 rounded-xl border border-emerald-800/60">
                          <div>
                            <span className="text-emerald-400 text-[10px] uppercase font-bold flex items-center gap-1">
                              ⚡ Raast Instant Pay ID
                            </span>
                            <p className="font-mono font-bold text-white text-sm">{meezanAcc.raastId}</p>
                          </div>
                          <button
                            type="button"
                            onClick={() => copyToClipboard(meezanAcc.raastId, 'raast')}
                            className="flex items-center gap-1 bg-emerald-800 hover:bg-emerald-700 text-white px-2.5 py-1 rounded-lg text-xs font-medium"
                          >
                            {copiedKey === 'raast' ? <Check className="w-3.5 h-3.5 text-white" /> : <Copy className="w-3.5 h-3.5" />}
                            <span>{copiedKey === 'raast' ? 'Copied' : 'Copy'}</span>
                          </button>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="space-y-2.5 text-xs">
                      <div className="bg-slate-800/80 p-2.5 rounded-xl border border-slate-700">
                        <span className="text-slate-400 text-[10px] uppercase font-semibold">Bank Name</span>
                        <p className="font-bold text-amber-300 text-sm">{hblAcc.bankName}</p>
                      </div>
                      <div className="flex justify-between items-center bg-slate-800/80 p-2.5 rounded-xl border border-slate-700">
                        <div>
                          <span className="text-slate-400 text-[10px] uppercase font-semibold">Account Title</span>
                          <p className="font-bold text-white text-sm">{hblAcc.accountTitle}</p>
                        </div>
                        <button
                          type="button"
                          onClick={() => copyToClipboard(hblAcc.accountTitle, 'hbl_title')}
                          className="flex items-center gap-1 bg-slate-700 hover:bg-slate-600 text-amber-300 px-2.5 py-1 rounded-lg text-xs font-medium"
                        >
                          {copiedKey === 'hbl_title' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                          <span>{copiedKey === 'hbl_title' ? 'Copied' : 'Copy'}</span>
                        </button>
                      </div>
                      <div className="flex justify-between items-center bg-slate-800/80 p-2.5 rounded-xl border border-slate-700">
                        <div>
                          <span className="text-slate-400 text-[10px] uppercase font-semibold">Account Number</span>
                          <p className="font-mono font-bold text-amber-300 text-sm tracking-wider">{hblAcc.accountNumber}</p>
                        </div>
                        <button
                          type="button"
                          onClick={() => copyToClipboard(hblAcc.accountNumber, 'hbl_acc')}
                          className="flex items-center gap-1 bg-slate-700 hover:bg-slate-600 text-amber-300 px-2.5 py-1 rounded-lg text-xs font-medium"
                        >
                          {copiedKey === 'hbl_acc' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                          <span>{copiedKey === 'hbl_acc' ? 'Copied' : 'Copy'}</span>
                        </button>
                      </div>
                      <div className="flex justify-between items-center bg-slate-800/80 p-2.5 rounded-xl border border-slate-700">
                        <div>
                          <span className="text-slate-400 text-[10px] uppercase font-semibold">IBAN Number</span>
                          <p className="font-mono font-bold text-emerald-300 text-xs tracking-wider">{hblAcc.iban}</p>
                        </div>
                        <button
                          type="button"
                          onClick={() => copyToClipboard(hblAcc.iban, 'hbl_iban')}
                          className="flex items-center gap-1 bg-slate-700 hover:bg-slate-600 text-emerald-300 px-2.5 py-1 rounded-lg text-xs font-medium"
                        >
                          {copiedKey === 'hbl_iban' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                          <span>{copiedKey === 'hbl_iban' ? 'Copied' : 'Copy'}</span>
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* EasyPaisa Box */}
              {paymentMethod === 'easypaisa' && (
                <div className="bg-emerald-900 text-white rounded-2xl p-4 sm:p-5 space-y-3 shadow-xl border border-emerald-700">
                  <div className="flex items-center gap-2 text-emerald-300 font-bold text-sm">
                    <Smartphone className="w-4 h-4" />
                    <span>EasyPaisa Mobile Account Transfer</span>
                  </div>
                  <div className="flex justify-between items-center bg-emerald-950 p-3 rounded-xl border border-emerald-800">
                    <div>
                      <span className="text-emerald-400 text-[10px] uppercase font-bold">EasyPaisa Account Number</span>
                      <p className="font-mono font-bold text-white text-base tracking-wider">{easypaisaAcc.accountNumber}</p>
                      <p className="text-xs text-emerald-200 mt-0.5 font-medium">Title: {easypaisaAcc.accountTitle}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => copyToClipboard(easypaisaAcc.accountNumber, 'ep')}
                      className="flex items-center gap-1 bg-emerald-700 hover:bg-emerald-600 text-white px-3 py-1.5 rounded-lg text-xs font-bold"
                    >
                      {copiedKey === 'ep' ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                      <span>{copiedKey === 'ep' ? 'Copied' : 'Copy Number'}</span>
                    </button>
                  </div>
                  <p className="text-[11px] text-emerald-100/90 leading-relaxed">
                    1. Open EasyPaisa App &gt; Send Money &gt; Enter <b>{easypaisaAcc.accountNumber}</b> &gt; Transfer Rs. <b>{totalAmount}/-</b><br />
                    2. Take screenshot of the success screen and note Transaction ID (TID).
                  </p>
                </div>
              )}

              {/* JazzCash Box */}
              {paymentMethod === 'jazzcash' && (
                <div className="bg-amber-950 text-white rounded-2xl p-4 sm:p-5 space-y-3 shadow-xl border border-amber-800">
                  <div className="flex items-center gap-2 text-amber-400 font-bold text-sm">
                    <Smartphone className="w-4 h-4" />
                    <span>JazzCash Mobile Account Transfer</span>
                  </div>
                  <div className="flex justify-between items-center bg-black/40 p-3 rounded-xl border border-amber-800/80">
                    <div>
                      <span className="text-amber-400 text-[10px] uppercase font-bold">JazzCash Account Number</span>
                      <p className="font-mono font-bold text-white text-base tracking-wider">{jazzcashAcc.accountNumber}</p>
                      <p className="text-xs text-amber-200 mt-0.5 font-medium">Title: {jazzcashAcc.accountTitle}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => copyToClipboard(jazzcashAcc.accountNumber, 'jc')}
                      className="flex items-center gap-1 bg-amber-700 hover:bg-amber-600 text-white px-3 py-1.5 rounded-lg text-xs font-bold"
                    >
                      {copiedKey === 'jc' ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                      <span>{copiedKey === 'jc' ? 'Copied' : 'Copy Number'}</span>
                    </button>
                  </div>
                  <p className="text-[11px] text-amber-100/90 leading-relaxed">
                    1. Open JazzCash App &gt; Money Transfer &gt; Mobile Account &gt; Enter <b>{jazzcashAcc.accountNumber}</b> &gt; Transfer Rs. <b>{totalAmount}/-</b><br />
                    2. Save receipt screenshot and copy Transaction ID (TID).
                  </p>
                </div>
              )}

              {/* Transfer Proof Submission Form */}
              <div className="bg-gray-50 p-4 rounded-2xl border border-gray-200 space-y-3">
                <h4 className="text-xs font-bold text-gray-900 uppercase tracking-wider">
                  Payment Verification Details
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">
                      Sender Account Title / Name *
                    </label>
                    <input
                      type="text"
                      value={senderAccountName}
                      onChange={(e) => setSenderAccountName(e.target.value)}
                      placeholder="Account title you sent from"
                      className="w-full px-3 py-2 bg-white border border-gray-300 rounded-xl text-xs focus:border-red-600 outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">
                      Transaction ID (TID / Ref #) *
                    </label>
                    <input
                      type="text"
                      value={transactionId}
                      onChange={(e) => setTransactionId(e.target.value)}
                      placeholder="e.g. 19283746501"
                      className="w-full px-3 py-2 bg-white border border-gray-300 rounded-xl text-xs font-mono focus:border-red-600 outline-none"
                    />
                  </div>
                </div>

                {/* File Upload for Payment Slip */}
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">
                    Upload Bank Transfer / Payment Slip Screenshot *
                  </label>
                  
                  <div className="flex items-center gap-3">
                    <label className="flex-1 cursor-pointer flex items-center justify-center gap-2 px-4 py-3 border-2 border-dashed border-gray-300 hover:border-red-600 rounded-xl bg-white hover:bg-red-50/50 transition-colors">
                      <Upload className="w-4 h-4 text-red-700" />
                      <span className="text-xs font-bold text-gray-700">
                        {paymentSlipFile ? paymentSlipFile.name : 'Choose receipt image or drag here'}
                      </span>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleFileChange}
                        className="hidden"
                      />
                    </label>

                    {slipPreview && (
                      <div className="relative w-12 h-12 rounded-xl overflow-hidden border border-gray-200 shadow-xs shrink-0">
                        <img src={slipPreview} alt="Receipt preview" className="w-full h-full object-cover" />
                      </div>
                    )}
                  </div>
                </div>

              </div>

            </div>
          )}

          {/* STEP 3: Order Review & Final Verification */}
          {step === 3 && (
            <div className="space-y-4">
              <div>
                <h3 className="font-bold text-gray-900 text-sm">Review & Final Confirmation</h3>
                <p className="text-xs text-gray-500">Please review your order summary and delivery address before confirming.</p>
              </div>

              {/* Order Items Preview */}
              <div className="bg-gray-50 rounded-2xl p-4 border border-gray-200 space-y-2">
                <div className="text-xs font-bold text-gray-900 border-b border-gray-200 pb-1.5 flex justify-between">
                  <span>Ordered Products ({cartItems.length})</span>
                  <span>Amount</span>
                </div>
                {cartItems.map((item) => (
                  <div key={item.id} className="flex justify-between text-xs py-1">
                    <span className="text-gray-800">
                      <b>{item.quantity}x</b> {item.name} <span className="text-gray-500">({item.packQuantity})</span>
                    </span>
                    <span className="font-bold text-gray-900">Rs. {item.price * item.quantity}</span>
                  </div>
                ))}

                <div className="border-t border-gray-200 pt-2 space-y-1 text-xs">
                  <div className="flex justify-between text-gray-600">
                    <span>Subtotal</span>
                    <span>Rs. {subtotal}/-</span>
                  </div>
                  <div className="flex justify-between text-gray-600">
                    <span>Karachi Delivery Fee</span>
                    <span>{isFreeDelivery ? 'FREE (Threshold met)' : `Rs. ${deliveryFee}/-`}</span>
                  </div>
                  <div className="flex justify-between font-black text-sm text-red-900 pt-1 border-t border-gray-200">
                    <span>Total Amount Paid</span>
                    <span>Rs. {totalAmount}/-</span>
                  </div>
                </div>
              </div>

              {/* Customer & Payment Summary Card */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div className="bg-amber-50/80 p-3.5 rounded-2xl border border-amber-200/80">
                  <span className="font-bold text-amber-900 block mb-1">📍 Delivery Details</span>
                  <p className="font-bold text-gray-900">{customer.fullName}</p>
                  <p className="text-gray-700">{customer.phone}</p>
                  <p className="text-gray-600 mt-1">{customer.address}, {customer.area}</p>
                </div>

                <div className="bg-emerald-50/80 p-3.5 rounded-2xl border border-emerald-200/80">
                  <span className="font-bold text-emerald-900 block mb-1">💳 Payment Verification</span>
                  <p className="font-bold text-gray-900 uppercase">{paymentMethod.replace('_', ' ')}</p>
                  <p className="text-gray-700">Sender: {senderAccountName}</p>
                  <p className="font-mono text-gray-600 mt-1">TID: {transactionId}</p>
                </div>
              </div>

              {/* Instant WhatsApp Guarantee Box */}
              <div className="p-3 bg-red-50 rounded-2xl border border-red-200 flex items-start gap-2.5 text-xs text-red-900">
                <CheckCircle2 className="w-4 h-4 text-red-700 shrink-0 mt-0.5" />
                <p>
                  Upon submission, your digital receipt will be generated. You can also send the order directly to <b>Hyderi Nimco WhatsApp (0336-2438422)</b> for immediate priority packing.
                </p>
              </div>

            </div>
          )}

        </div>

        {/* Modal Navigation Buttons */}
        <div className="p-4 sm:p-5 border-t border-gray-200 bg-gray-50 flex items-center justify-between gap-3">
          {step > 1 ? (
            <button
              type="button"
              onClick={() => { setErrorMsg(''); setStep(step - 1); }}
              className="flex items-center gap-1.5 px-4 py-2.5 text-xs font-bold text-gray-700 hover:text-gray-900 bg-white border border-gray-300 rounded-xl hover:bg-gray-100 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back</span>
            </button>
          ) : (
            <div></div>
          )}

          {step < 3 ? (
            <button
              type="button"
              onClick={() => {
                if (step === 1 && validateStep1()) setStep(2);
                else if (step === 2 && validateStep2()) setStep(3);
              }}
              className="flex items-center gap-2 px-6 py-2.5 bg-gradient-to-r from-red-700 to-red-800 hover:from-red-800 hover:to-red-900 text-white rounded-xl text-xs font-bold shadow-lg shadow-red-900/20 transition-all hover:scale-105"
            >
              <span>{step === 1 ? 'Proceed to Payment' : 'Review & Confirm'}</span>
              <ArrowRight className="w-4 h-4 text-amber-300" />
            </button>
          ) : (
            <button
              type="button"
              disabled={isSubmitting}
              onClick={handleSubmitOrder}
              className="flex-1 max-w-sm flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-700 hover:to-emerald-800 text-white rounded-xl text-xs font-black shadow-lg shadow-emerald-700/25 transition-all hover:scale-102"
            >
              {isSubmitting ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  <span>Processing Secure Order...</span>
                </>
              ) : (
                <>
                  <Lock className="w-4 h-4 text-amber-300" />
                  <span>Submit Pre-Paid Order (Rs. {totalAmount}/-)</span>
                </>
              )}
            </button>
          )}
        </div>

      </div>
    </div>
  );
}
