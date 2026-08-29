import React, { useState, useEffect } from 'react';
import {
  X, Lock, Plus, Trash2, Edit, Check, Eye, DollarSign,
  Package, ShoppingCart, Settings, RefreshCw, Upload,
  AlertCircle, CheckCircle2, Phone, MapPin, Search
} from 'lucide-react';
import { CATEGORIES } from './CategoryFilter';

export default function AdminPortal({
  isOpen,
  onClose,
  products,
  onRefreshProducts,
  settings,
  onRefreshSettings
}) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [pin, setPin] = useState('');
  const [authError, setAuthError] = useState('');

  // Tabs: 'products' | 'orders' | 'settings'
  const [activeTab, setActiveTab] = useState('orders');

  // Orders State
  const [orders, setOrders] = useState([]);
  const [ordersLoading, setOrdersLoading] = useState(false);
  const [selectedSlipImage, setSelectedSlipImage] = useState(null);
  const [orderStatusFilter, setOrderStatusFilter] = useState('all');

  // Product Edit / Add Modal
  const [showProductModal, setShowProductModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [productForm, setProductForm] = useState({
    name: '',
    category: 'samosa',
    categoryLabel: 'Samosa & Appetizers',
    packQuantity: '12 pcs',
    price: '',
    badge: '',
    description: '',
    imageUrl: '',
    isAvailable: true,
    featured: false
  });
  const [productImageFile, setProductImageFile] = useState(null);

  // Settings State Form
  const [settingsForm, setSettingsForm] = useState(settings || {});
  const [settingsSaved, setSettingsSaved] = useState(false);

  useEffect(() => {
    if (isOpen && isAuthenticated) {
      fetchOrders();
    }
  }, [isOpen, isAuthenticated]);

  useEffect(() => {
    if (settings) {
      setSettingsForm(settings);
    }
  }, [settings]);

  const handleLogin = async (e) => {
    e.preventDefault();
    setAuthError('');
    try {
      const res = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pin, password: pin })
      });
      const data = await res.json();
      if (data.success) {
        setIsAuthenticated(true);
        fetchOrders();
      } else {
        setAuthError(data.message || 'Incorrect PIN / Password');
      }
    } catch (err) {
      // Local fallback for offline/preview
      if (pin === '7860' || pin === 'admin') {
        setIsAuthenticated(true);
      } else {
        setAuthError('Incorrect PIN (Default: 7860)');
      }
    }
  };

  const fetchOrders = async () => {
    setOrdersLoading(true);
    try {
      const res = await fetch('/api/orders');
      const data = await res.json();
      if (data.success) {
        setOrders(data.orders || []);
      }
    } catch (err) {
      console.error('Error fetching orders:', err);
    } finally {
      setOrdersLoading(false);
    }
  };

  const handleUpdateOrderStatus = async (orderId, newStatus) => {
    try {
      const res = await fetch(`/api/orders/${orderId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus })
      });
      const data = await res.json();
      if (data.success) {
        setOrders(orders.map(o => (o.id === orderId ? data.order : o)));
      }
    } catch (err) {
      // Local update
      setOrders(orders.map(o => (o.id === orderId ? { ...o, status: newStatus } : o)));
    }
  };

  const handleSaveProduct = async (e) => {
    e.preventDefault();
    try {
      const formData = new FormData();
      formData.append('name', productForm.name);
      formData.append('category', productForm.category);
      
      const catObj = CATEGORIES.find(c => c.id === productForm.category);
      formData.append('categoryLabel', catObj ? catObj.label : 'Special');
      formData.append('packQuantity', productForm.packQuantity);
      formData.append('price', productForm.price);
      formData.append('badge', productForm.badge);
      formData.append('description', productForm.description);
      formData.append('imageUrl', productForm.imageUrl);
      formData.append('isAvailable', productForm.isAvailable);
      formData.append('featured', productForm.featured);

      if (productImageFile) {
        formData.append('imageFile', productImageFile);
      }

      const url = editingProduct ? `/api/products/${editingProduct.id}` : '/api/products';
      const method = editingProduct ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        body: formData
      });

      const data = await res.json();
      if (data.success) {
        setShowProductModal(false);
        setEditingProduct(null);
        setProductImageFile(null);
        onRefreshProducts();
      }
    } catch (err) {
      console.error('Save product error:', err);
      setShowProductModal(false);
      onRefreshProducts();
    }
  };

  const handleDeleteProduct = async (id) => {
    if (!window.confirm('Are you sure you want to delete this menu item?')) return;
    try {
      await fetch(`/api/products/${id}`, { method: 'DELETE' });
      onRefreshProducts();
    } catch (err) {
      console.error('Delete product error:', err);
      onRefreshProducts();
    }
  };

  const handleSaveSettings = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/admin/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settingsForm)
      });
      const data = await res.json();
      if (data.success) {
        setSettingsSaved(true);
        setTimeout(() => setSettingsSaved(false), 2500);
        onRefreshSettings();
      }
    } catch (err) {
      console.error('Save settings error:', err);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-6">
      <div className="relative bg-white rounded-3xl max-w-5xl w-full h-[90vh] overflow-hidden shadow-2xl flex flex-col border border-gray-200">
        
        {/* Header Bar */}
        <div className="p-4 sm:p-5 bg-slate-900 text-white flex items-center justify-between border-b border-slate-800 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-red-700 text-white flex items-center justify-center font-black">
              <Lock className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-extrabold text-base sm:text-lg">Management & Store Control Portal</h2>
                <span className="bg-red-500/20 text-red-400 text-[10px] font-bold px-2 py-0.5 rounded-full border border-red-500/30">
                  Staff Only
                </span>
              </div>
              <p className="text-xs text-slate-400">
                New Hyderi Nimco & Frozen — North Nazimabad Branch
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-9 h-9 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white flex items-center justify-center transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* LOGIN VIEW IF NOT AUTHENTICATED */}
        {!isAuthenticated ? (
          <div className="flex-1 flex items-center justify-center p-6 bg-slate-50">
            <div className="max-w-sm w-full bg-white p-8 rounded-3xl shadow-xl border border-gray-200 text-center space-y-5">
              <div className="w-14 h-14 rounded-2xl bg-red-100 text-red-800 flex items-center justify-center mx-auto shadow-inner">
                <Lock className="w-7 h-7" />
              </div>
              <div>
                <h3 className="text-xl font-black text-gray-900">Admin Authentication</h3>
                <p className="text-xs text-gray-500 mt-1">
                  Enter master PIN to manage menu, view payment receipts, and orders.
                </p>
              </div>

              <form onSubmit={handleLogin} className="space-y-4">
                <div>
                  <input
                    type="password"
                    value={pin}
                    onChange={(e) => setPin(e.target.value)}
                    placeholder="Enter PIN (Default: 7860)"
                    className="w-full text-center text-xl tracking-widest font-mono font-bold py-3 bg-gray-50 border border-gray-300 rounded-xl focus:bg-white focus:border-red-600 outline-none"
                    autoFocus
                  />
                </div>

                {authError && (
                  <p className="text-xs text-red-600 font-semibold bg-red-50 py-1.5 px-3 rounded-lg border border-red-200">
                    {authError}
                  </p>
                )}

                <button
                  type="submit"
                  className="w-full py-3 bg-red-800 hover:bg-red-900 text-white rounded-xl font-bold text-sm shadow-md transition-all"
                >
                  Unlock Portal
                </button>
              </form>
              <p className="text-[11px] text-gray-400">Authorized store personnel only.</p>
            </div>
          </div>
        ) : (
          /* AUTHENTICATED ADMIN DASHBOARD */
          <div className="flex-1 flex flex-col overflow-hidden bg-slate-50">
            
            {/* Top Navigation Tabs */}
            <div className="bg-white border-b border-gray-200 px-6 py-2.5 flex items-center justify-between flex-wrap gap-2 shrink-0">
              <div className="flex gap-2">
                <button
                  onClick={() => setActiveTab('orders')}
                  className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                    activeTab === 'orders'
                      ? 'bg-red-800 text-white shadow-sm'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  <ShoppingCart className="w-4 h-4" />
                  <span>Customer Orders ({orders.length})</span>
                </button>

                <button
                  onClick={() => setActiveTab('products')}
                  className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                    activeTab === 'products'
                      ? 'bg-red-800 text-white shadow-sm'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  <Package className="w-4 h-4" />
                  <span>Menu & Items ({products.length})</span>
                </button>

                <button
                  onClick={() => setActiveTab('settings')}
                  className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                    activeTab === 'settings'
                      ? 'bg-red-800 text-white shadow-sm'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  <Settings className="w-4 h-4" />
                  <span>Bank & Store Settings</span>
                </button>
              </div>

              {activeTab === 'products' && (
                <button
                  onClick={() => {
                    setEditingProduct(null);
                    setProductForm({
                      name: '',
                      category: 'samosa',
                      categoryLabel: 'Samosa & Appetizers',
                      packQuantity: '12 pcs',
                      price: '',
                      badge: '',
                      description: '',
                      imageUrl: '',
                      isAvailable: true,
                      featured: false
                    });
                    setShowProductModal(true);
                  }}
                  className="flex items-center gap-1.5 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-sm transition-all"
                >
                  <Plus className="w-4 h-4" />
                  <span>Add New Product</span>
                </button>
              )}

              {activeTab === 'orders' && (
                <button
                  onClick={fetchOrders}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-xs font-semibold"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${ordersLoading ? 'animate-spin' : ''}`} />
                  <span>Refresh Orders</span>
                </button>
              )}
            </div>

            {/* TAB CONTENT */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-6">
              
              {/* TAB 1: CUSTOMER ORDERS & SLIP VERIFICATION */}
              {activeTab === 'orders' && (
                <div className="space-y-4">
                  {/* Status Filter */}
                  <div className="flex gap-2 overflow-x-auto pb-1 text-xs">
                    {['all', 'pending_verification', 'payment_verified', 'preparing', 'out_for_delivery', 'completed'].map((st) => (
                      <button
                        key={st}
                        onClick={() => setOrderStatusFilter(st)}
                        className={`px-3 py-1.5 rounded-lg font-bold uppercase whitespace-nowrap text-[11px] ${
                          orderStatusFilter === st
                            ? 'bg-slate-900 text-white'
                            : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-100'
                        }`}
                      >
                        {st.replace(/_/g, ' ')}
                      </button>
                    ))}
                  </div>

                  {orders.length === 0 ? (
                    <div className="bg-white rounded-2xl p-12 text-center text-gray-400 border border-gray-200 space-y-2">
                      <ShoppingCart className="w-12 h-12 mx-auto text-gray-300" />
                      <p className="font-bold text-gray-700">No orders received yet.</p>
                      <p className="text-xs">New pre-paid orders with receipts will appear here in real time.</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {orders
                        .filter(o => orderStatusFilter === 'all' || o.status === orderStatusFilter)
                        .map((ord) => (
                          <div
                            key={ord.id}
                            className="bg-white rounded-2xl p-4 sm:p-5 border border-gray-200 shadow-sm space-y-3"
                          >
                            <div className="flex items-start justify-between flex-wrap gap-2">
                              <div>
                                <div className="flex items-center gap-2">
                                  <span className="font-mono font-black text-sm text-gray-900">
                                    {ord.orderRef}
                                  </span>
                                  <span className="text-xs text-gray-400">•</span>
                                  <span className="text-xs text-gray-500 font-medium">
                                    {ord.formattedDate || new Date(ord.createdAt).toLocaleString()}
                                  </span>
                                </div>
                                <h4 className="font-bold text-gray-900 text-base mt-0.5">
                                  {ord.customer?.fullName}{' '}
                                  <a
                                    href={`tel:${ord.customer?.phone}`}
                                    className="text-red-700 text-xs font-semibold hover:underline inline-flex items-center gap-1 ml-2"
                                  >
                                    <Phone className="w-3 h-3" /> {ord.customer?.phone}
                                  </a>
                                </h4>
                                <p className="text-xs text-gray-600 flex items-center gap-1 mt-0.5">
                                  <MapPin className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                                  <span>{ord.customer?.address}, {ord.customer?.area}</span>
                                </p>
                              </div>

                              {/* Status Badge & Select */}
                              <div className="flex items-center gap-2">
                                <select
                                  value={ord.status}
                                  onChange={(e) => handleUpdateOrderStatus(ord.id, e.target.value)}
                                  className={`text-xs font-black uppercase px-3 py-1.5 rounded-xl border outline-none cursor-pointer ${
                                    ord.status === 'pending_verification'
                                      ? 'bg-amber-100 text-amber-900 border-amber-300'
                                      : ord.status === 'payment_verified'
                                      ? 'bg-blue-100 text-blue-900 border-blue-300'
                                      : ord.status === 'preparing'
                                      ? 'bg-purple-100 text-purple-900 border-purple-300'
                                      : ord.status === 'out_for_delivery'
                                      ? 'bg-indigo-100 text-indigo-900 border-indigo-300'
                                      : ord.status === 'completed'
                                      ? 'bg-emerald-100 text-emerald-900 border-emerald-300'
                                      : 'bg-red-100 text-red-900 border-red-300'
                                  }`}
                                >
                                  <option value="pending_verification">⏳ Pending Verification</option>
                                  <option value="payment_verified">✅ Payment Verified</option>
                                  <option value="preparing">🍳 In Kitchen (Chilled Packing)</option>
                                  <option value="out_for_delivery">🛵 Out For Delivery</option>
                                  <option value="completed">🎉 Delivered & Completed</option>
                                  <option value="cancelled">❌ Cancelled</option>
                                </select>
                              </div>
                            </div>

                            {/* Payment Verification Block */}
                            <div className="bg-slate-900 text-white rounded-xl p-3 text-xs flex items-center justify-between flex-wrap gap-2">
                              <div className="space-y-0.5">
                                <span className="text-slate-400 text-[10px] uppercase font-bold">
                                  Payment: {ord.paymentMethod?.toUpperCase()} ({ord.paymentDetails?.bankName})
                                </span>
                                <p className="font-semibold text-amber-300">
                                  Sender: <b className="text-white">{ord.paymentDetails?.senderAccountName || 'N/A'}</b> | TID: <b className="font-mono text-emerald-300">{ord.paymentDetails?.transactionId || 'N/A'}</b>
                                </p>
                              </div>

                              {ord.paymentDetails?.paymentSlipUrl ? (
                                <button
                                  onClick={() => setSelectedSlipImage(ord.paymentDetails.paymentSlipUrl)}
                                  className="flex items-center gap-1 bg-amber-500 hover:bg-amber-400 text-slate-950 font-extrabold px-3 py-1.5 rounded-lg text-xs transition-colors"
                                >
                                  <Eye className="w-3.5 h-3.5" />
                                  <span>View Payment Slip</span>
                                </button>
                              ) : (
                                <span className="text-slate-500 text-[11px]">No image slip attached</span>
                              )}
                            </div>

                            {/* Ordered Items Pill list */}
                            <div className="flex flex-wrap gap-2 pt-1">
                              {ord.items?.map((it, i) => (
                                <span
                                  key={i}
                                  className="bg-gray-100 text-gray-800 text-xs px-2.5 py-1 rounded-lg font-medium border border-gray-200"
                                >
                                  <b>{it.quantity}x</b> {it.name} ({it.packQuantity})
                                </span>
                              ))}
                            </div>

                            <div className="flex justify-between items-center text-xs font-bold text-gray-700 pt-2 border-t border-gray-100">
                              <span>Subtotal: Rs. {ord.subtotal} + Delivery: Rs. {ord.deliveryFee}</span>
                              <span className="text-red-800 text-sm font-black">
                                Total Paid: Rs. {ord.totalAmount}/-
                              </span>
                            </div>
                          </div>
                        ))}
                    </div>
                  )}
                </div>
              )}

              {/* TAB 2: MENU & PRODUCT MANAGEMENT */}
              {activeTab === 'products' && (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                    {products.map((p) => (
                      <div
                        key={p.id}
                        className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-xs flex flex-col justify-between"
                      >
                        <div className="relative aspect-video bg-amber-50">
                          <img src={p.image} alt={p.name} className="w-full h-full object-cover" />
                          <div className="absolute top-2 right-2 bg-black/70 text-amber-300 font-bold text-[10px] px-2 py-0.5 rounded">
                            {p.packQuantity}
                          </div>
                          {!p.isAvailable && (
                            <div className="absolute inset-0 bg-red-950/70 flex items-center justify-center text-white text-xs font-bold uppercase">
                              Out of Stock
                            </div>
                          )}
                        </div>

                        <div className="p-3 flex-1 flex flex-col justify-between">
                          <div>
                            <span className="text-[10px] text-red-700 font-bold uppercase">{p.category}</span>
                            <h4 className="font-bold text-sm text-gray-900 line-clamp-1">{p.name}</h4>
                            <p className="text-red-800 font-extrabold text-sm mt-1">Rs. {p.price}/-</p>
                          </div>

                          <div className="flex items-center justify-between gap-2 mt-3 pt-2 border-t border-gray-100">
                            <button
                              onClick={() => {
                                setEditingProduct(p);
                                setProductForm({
                                  name: p.name,
                                  category: p.category,
                                  categoryLabel: p.categoryLabel,
                                  packQuantity: p.packQuantity,
                                  price: p.price,
                                  badge: p.badge || '',
                                  description: p.description || '',
                                  imageUrl: p.image || '',
                                  isAvailable: p.isAvailable,
                                  featured: p.featured || false
                                });
                                setShowProductModal(true);
                              }}
                              className="flex items-center gap-1 text-xs font-bold text-gray-700 hover:text-red-800"
                            >
                              <Edit className="w-3.5 h-3.5" />
                              <span>Edit</span>
                            </button>

                            <button
                              onClick={() => handleDeleteProduct(p.id)}
                              className="text-xs font-bold text-red-600 hover:text-red-800 p-1"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* TAB 3: BANK & STORE SETTINGS */}
              {activeTab === 'settings' && (
                <div className="max-w-2xl bg-white p-6 rounded-3xl border border-gray-200 shadow-sm space-y-5">
                  <div className="flex items-center justify-between border-b border-gray-100 pb-3">
                    <div>
                      <h3 className="font-extrabold text-gray-900 text-base">Store & Bank Account Settings</h3>
                      <p className="text-xs text-gray-500">Edit Meezan, HBL, EasyPaisa, and delivery terms.</p>
                    </div>
                    {settingsSaved && (
                      <span className="flex items-center gap-1 text-xs font-bold text-emerald-700 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200">
                        <Check className="w-3.5 h-3.5" /> Saved!
                      </span>
                    )}
                  </div>

                  <form onSubmit={handleSaveSettings} className="space-y-4 text-xs">
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block font-bold text-gray-700 mb-1">Phone 1 (Mobile / WhatsApp)</label>
                        <input
                          type="text"
                          value={settingsForm.phone1 || ''}
                          onChange={(e) => setSettingsForm({ ...settingsForm, phone1: e.target.value })}
                          className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-xl outline-none"
                        />
                      </div>
                      <div>
                        <label className="block font-bold text-gray-700 mb-1">Phone 2 (PTCL Shop)</label>
                        <input
                          type="text"
                          value={settingsForm.phone2 || ''}
                          onChange={(e) => setSettingsForm({ ...settingsForm, phone2: e.target.value })}
                          className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-xl outline-none"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block font-bold text-gray-700 mb-1">Standard Delivery Fee (Rs.)</label>
                        <input
                          type="number"
                          value={settingsForm.deliveryFee || 150}
                          onChange={(e) => setSettingsForm({ ...settingsForm, deliveryFee: Number(e.target.value) })}
                          className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-xl outline-none"
                        />
                      </div>
                      <div>
                        <label className="block font-bold text-gray-700 mb-1">Free Delivery Threshold (Rs.)</label>
                        <input
                          type="number"
                          value={settingsForm.freeDeliveryAbove || 2500}
                          onChange={(e) => setSettingsForm({ ...settingsForm, freeDeliveryAbove: Number(e.target.value) })}
                          className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-xl outline-none"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block font-bold text-gray-700 mb-1">Top Announcement Bar Text</label>
                      <input
                        type="text"
                        value={settingsForm.announcement || ''}
                        onChange={(e) => setSettingsForm({ ...settingsForm, announcement: e.target.value })}
                        className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-xl outline-none"
                      />
                    </div>

                    <button
                      type="submit"
                      className="px-6 py-3 bg-red-800 hover:bg-red-900 text-white font-bold rounded-xl shadow-md transition-all"
                    >
                      Save Store Configurations
                    </button>
                  </form>
                </div>
              )}

            </div>

          </div>
        )}

      </div>

      {/* FULL-SIZE SLIP IMAGE LIGHTBOX */}
      {selectedSlipImage && (
        <div
          onClick={() => setSelectedSlipImage(null)}
          className="fixed inset-0 z-60 bg-black/90 flex items-center justify-center p-4 cursor-pointer animate-in fade-in"
        >
          <div className="relative max-w-2xl max-h-[90vh] bg-white rounded-2xl overflow-hidden p-2" onClick={(e) => e.stopPropagation()}>
            <button
              onClick={() => setSelectedSlipImage(null)}
              className="absolute top-4 right-4 w-9 h-9 rounded-full bg-black/70 text-white flex items-center justify-center hover:bg-black"
            >
              <X className="w-5 h-5" />
            </button>
            <img
              src={selectedSlipImage}
              alt="Payment Slip Full Proof"
              className="max-h-[85vh] w-auto mx-auto object-contain rounded-xl"
            />
          </div>
        </div>
      )}

      {/* ADD / EDIT PRODUCT MODAL */}
      {showProductModal && (
        <div className="fixed inset-0 z-60 bg-black/70 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4 border border-gray-200 animate-in zoom-in-95">
            <div className="flex justify-between items-center border-b pb-3">
              <h3 className="font-extrabold text-base text-gray-900">
                {editingProduct ? 'Edit Product Item' : 'Add New Menu Item'}
              </h3>
              <button onClick={() => setShowProductModal(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveProduct} className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-gray-700 mb-1">Item Name *</label>
                <input
                  type="text"
                  required
                  value={productForm.name}
                  onChange={(e) => setProductForm({ ...productForm, name: e.target.value })}
                  placeholder="e.g. Chicken Cheese Samosa"
                  className="w-full px-3 py-2 bg-gray-50 border rounded-xl outline-none focus:border-red-600"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-bold text-gray-700 mb-1">Category *</label>
                  <select
                    value={productForm.category}
                    onChange={(e) => setProductForm({ ...productForm, category: e.target.value })}
                    className="w-full px-3 py-2 bg-gray-50 border rounded-xl outline-none"
                  >
                    <option value="samosa">Samosas</option>
                    <option value="roll">Spring Rolls</option>
                    <option value="kabab">Kababs & Momos</option>
                    <option value="pizza">Mini Pizzas</option>
                    <option value="special">Specialties & Bites</option>
                    <option value="patti">Patti & Paratha</option>
                    <option value="nimco">Nimco & Savouries</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-gray-700 mb-1">Pack Quantity *</label>
                  <input
                    type="text"
                    required
                    value={productForm.packQuantity}
                    onChange={(e) => setProductForm({ ...productForm, packQuantity: e.target.value })}
                    placeholder="e.g. 12 pcs / 24 pcs / 1 kg"
                    className="w-full px-3 py-2 bg-gray-50 border rounded-xl outline-none focus:border-red-600"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-bold text-gray-700 mb-1">Price (Rs.) *</label>
                  <input
                    type="number"
                    required
                    value={productForm.price}
                    onChange={(e) => setProductForm({ ...productForm, price: e.target.value })}
                    placeholder="e.g. 400"
                    className="w-full px-3 py-2 bg-gray-50 border rounded-xl outline-none focus:border-red-600"
                  />
                </div>
                <div>
                  <label className="block font-bold text-gray-700 mb-1">Badge Tag</label>
                  <input
                    type="text"
                    value={productForm.badge}
                    onChange={(e) => setProductForm({ ...productForm, badge: e.target.value })}
                    placeholder="e.g. Best Seller"
                    className="w-full px-3 py-2 bg-gray-50 border rounded-xl outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-gray-700 mb-1">Image URL (Google / Web Photo)</label>
                <input
                  type="text"
                  value={productForm.imageUrl}
                  onChange={(e) => setProductForm({ ...productForm, imageUrl: e.target.value })}
                  placeholder="https://..."
                  className="w-full px-3 py-2 bg-gray-50 border rounded-xl outline-none focus:border-red-600"
                />
              </div>

              <div>
                <label className="block font-bold text-gray-700 mb-1">Or Upload Photo</label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => setProductImageFile(e.target.files[0])}
                  className="w-full text-xs text-gray-500"
                />
              </div>

              <div>
                <label className="block font-bold text-gray-700 mb-1">Description</label>
                <textarea
                  rows={2}
                  value={productForm.description}
                  onChange={(e) => setProductForm({ ...productForm, description: e.target.value })}
                  placeholder="Short appetizing description..."
                  className="w-full px-3 py-2 bg-gray-50 border rounded-xl outline-none"
                />
              </div>

              <div className="flex gap-4 pt-1">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={productForm.isAvailable}
                    onChange={(e) => setProductForm({ ...productForm, isAvailable: e.target.checked })}
                    className="rounded text-red-800"
                  />
                  <span className="font-bold text-gray-700">In Stock</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={productForm.featured}
                    onChange={(e) => setProductForm({ ...productForm, featured: e.target.checked })}
                    className="rounded text-red-800"
                  />
                  <span className="font-bold text-gray-700">Featured Item</span>
                </label>
              </div>

              <button
                type="submit"
                className="w-full py-3 bg-red-800 hover:bg-red-900 text-white font-bold rounded-xl mt-2 shadow-md"
              >
                Save Product
              </button>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
