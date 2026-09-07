import React, { useState, useEffect } from 'react';
import Navbar from './components/Navbar';
import HeroBanner from './components/HeroBanner';
import CategoryFilter from './components/CategoryFilter';
import ProductCard from './components/ProductCard';
import ProductModal from './components/ProductModal';
import CartDrawer from './components/CartDrawer';
import CheckoutModal from './components/CheckoutModal';
import OrderSuccessModal from './components/OrderSuccessModal';
import OrderTrackingModal from './components/OrderTrackingModal';
import AdminPortal from './components/AdminPortal';
import Footer from './components/Footer';

// Default initial fallback catalog if backend is starting
import initialProductsData from '../server/data/products.json';
import initialSettingsData from '../server/data/settings.json';

export default function App() {
  const [products, setProducts] = useState(initialProductsData || []);
  const [settings, setSettings] = useState(initialSettingsData || {});
  const [activeCategory, setActiveCategory] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  
  // Cart state persisted in localStorage
  const [cartItems, setCartItems] = useState(() => {
    try {
      const saved = localStorage.getItem('hyderi_cart');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  // Active customer order persisted in localStorage
  const [activeOrder, setActiveOrder] = useState(() => {
    try {
      const saved = localStorage.getItem('hyderi_active_order');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  // Modals
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [isSuccessOpen, setIsSuccessOpen] = useState(false);
  const [latestOrder, setLatestOrder] = useState(null);
  const [isTrackingOpen, setIsTrackingOpen] = useState(false);
  const [isAdminOpen, setIsAdminOpen] = useState(false);
  const [isBannerDismissed, setIsBannerDismissed] = useState(false);

  // Sync cart to localStorage
  useEffect(() => {
    try {
      localStorage.setItem('hyderi_cart', JSON.stringify(cartItems));
    } catch (e) {
      console.error(e);
    }
  }, [cartItems]);

  // Auto-sync active order status in real-time (like Foodpanda)
  useEffect(() => {
    if (!activeOrder || activeOrder.status === 'cancelled' || activeOrder.status === 'completed') return;
    const syncActiveOrder = async () => {
      try {
        const res = await fetch(`/api/orders/${encodeURIComponent(activeOrder.orderRef)}`);
        if (res.status === 404) {
          try { localStorage.removeItem('hyderi_active_order'); } catch (e) {}
          setActiveOrder(null);
          setLatestOrder(null);
          setIsSuccessOpen(false);
          return;
        }
        const data = await res.json();
        if (data.success && data.order && data.order.status !== activeOrder.status) {
          setActiveOrder(data.order);
          try { localStorage.setItem('hyderi_active_order', JSON.stringify(data.order)); } catch (e) {}
          if (latestOrder && latestOrder.orderRef === data.order.orderRef) {
            setLatestOrder(data.order);
          }
        }
      } catch (e) {}
    };
    const timer = setInterval(syncActiveOrder, 8000);
    return () => clearInterval(timer);
  }, [activeOrder, latestOrder]);

  // Fetch live products and settings
  const fetchProducts = async () => {
    try {
      const res = await fetch('/api/products');
      const data = await res.json();
      if (data.success && data.products) {
        setProducts(data.products);
      }
    } catch (err) {
      console.log('Using local products cache');
    }
  };

  const fetchSettings = async () => {
    try {
      const res = await fetch('/api/settings');
      const data = await res.json();
      if (data.success && data.settings) {
        setSettings(data.settings);
      }
    } catch (err) {
      console.log('Using local settings cache');
    }
  };

  useEffect(() => {
    fetchProducts();
    fetchSettings();
  }, []);

  // Cart operations
  const handleAddToCart = (product, quantity = 1) => {
    setCartItems(prev => {
      const existing = prev.find(item => item.id === product.id);
      if (existing) {
        return prev.map(item =>
          item.id === product.id
            ? { ...item, quantity: item.quantity + quantity }
            : item
        );
      }
      return [...prev, { ...product, quantity }];
    });
  };

  const handleUpdateQuantity = (productId, newQty) => {
    if (newQty <= 0) {
      handleRemoveItem(productId);
      return;
    }
    setCartItems(prev =>
      prev.map(item => (item.id === productId ? { ...item, quantity: newQty } : item))
    );
  };

  const handleRemoveItem = (productId) => {
    setCartItems(prev => prev.filter(item => item.id !== productId));
  };

  const handleOpenDetail = (product) => {
    setSelectedProduct(product);
    setIsDetailOpen(true);
  };

  const handleProceedCheckout = () => {
    setIsCartOpen(false);
    setIsCheckoutOpen(true);
  };

  const handleOrderComplete = (order) => {
    setLatestOrder(order);
    setActiveOrder(order);
    setCartItems([]);
    setIsCheckoutOpen(false);
    setIsSuccessOpen(true);
  };

  // Filter products by category and search
  const filteredProducts = products.filter(product => {
    const matchesCategory = activeCategory === 'all' || product.category === activeCategory;
    const matchesSearch = searchQuery.trim() === '' ||
      product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      product.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      product.categoryLabel?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      product.packQuantity?.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const cartTotalCount = cartItems.reduce((sum, it) => sum + it.quantity, 0);

  return (
    <div className="min-h-screen flex flex-col bg-[#FFFDF9]">
      
      {/* Header & Navbar */}
      <Navbar
        cartCount={cartTotalCount}
        onOpenCart={() => setIsCartOpen(true)}
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        onOpenTracking={() => setIsTrackingOpen(true)}
        settings={settings}
      />

      {/* Hero Showcase */}
      <HeroBanner
        onExploreMenu={() => {
          const el = document.getElementById('menu-section');
          if (el) el.scrollIntoView({ behavior: 'smooth' });
        }}
        settings={settings}
      />

      {/* Category Navigation Bar */}
      <div id="menu-section">
        <CategoryFilter
          activeCategory={activeCategory}
          onSelectCategory={setActiveCategory}
          products={products}
        />
      </div>

      {/* Main Products Grid Section */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 flex-1">
        
        {/* Section Header */}
        <div className="flex items-end justify-between mb-6 sm:mb-8 flex-wrap gap-4 border-b border-gray-100 pb-4">
          <div>
            <div className="flex items-center gap-2 text-xs font-bold text-red-700 uppercase tracking-widest">
              <span>Authentic Brochure Catalog</span>
              <span>•</span>
              <span>{filteredProducts.length} Items</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-black text-gray-900 mt-1">
              {activeCategory === 'all' ? 'All Frozen Specialties & Nimco' : `${filteredProducts[0]?.categoryLabel || 'Menu Items'}`}
            </h2>
          </div>

          {searchQuery && (
            <div className="text-xs text-gray-500">
              Showing results for "<b className="text-gray-900">{searchQuery}</b>"
            </div>
          )}
        </div>

        {/* Products Grid */}
        {filteredProducts.length === 0 ? (
          <div className="py-16 text-center text-gray-500 space-y-3 bg-white rounded-3xl border border-gray-200">
            <div className="text-4xl">🥟</div>
            <h3 className="font-bold text-gray-800 text-lg">No matching products found</h3>
            <p className="text-xs max-w-sm mx-auto text-gray-500">
              Try searching with another keyword like 'samosa', 'roll', 'kabab' or switch category.
            </p>
            <button
              onClick={() => { setActiveCategory('all'); setSearchQuery(''); }}
              className="px-4 py-2 bg-red-800 text-white rounded-xl text-xs font-bold hover:bg-red-900"
            >
              Clear Filters
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5 sm:gap-6">
            {filteredProducts.map((product) => (
              <ProductCard
                key={product.id}
                product={product}
                onAddToCart={handleAddToCart}
                onOpenDetail={handleOpenDetail}
              />
            ))}
          </div>
        )}

      </main>

      {/* Footer with Discreet Admin Entrance */}
      <Footer
        onOpenAdmin={() => setIsAdminOpen(true)}
        settings={settings}
      />

      {/* MODALS */}
      <ProductModal
        product={selectedProduct}
        isOpen={isDetailOpen}
        onClose={() => setIsDetailOpen(false)}
        onAddToCart={handleAddToCart}
      />

      <CartDrawer
        isOpen={isCartOpen}
        onClose={() => setIsCartOpen(false)}
        cartItems={cartItems}
        onUpdateQuantity={handleUpdateQuantity}
        onRemoveItem={handleRemoveItem}
        onProceedCheckout={handleProceedCheckout}
        settings={settings}
      />

      <CheckoutModal
        isOpen={isCheckoutOpen}
        onClose={() => setIsCheckoutOpen(false)}
        cartItems={cartItems}
        settings={settings}
        onOrderComplete={handleOrderComplete}
      />

      <OrderSuccessModal
        order={latestOrder || activeOrder}
        isOpen={isSuccessOpen}
        onClose={() => setIsSuccessOpen(false)}
        settings={settings}
        onCancelOrder={(cancelledOrder) => {
          setLatestOrder(cancelledOrder);
          setActiveOrder(cancelledOrder);
        }}
      />

      <OrderTrackingModal
        isOpen={isTrackingOpen}
        onClose={() => setIsTrackingOpen(false)}
      />

      <AdminPortal
        isOpen={isAdminOpen}
        onClose={() => setIsAdminOpen(false)}
        products={products}
        onRefreshProducts={fetchProducts}
        settings={settings}
        onRefreshSettings={fetchSettings}
      />

      {/* Customer Active Order Persistent Screen Banner (Hidden when any modal is open or dismissed) */}
      {activeOrder && activeOrder.status !== 'cancelled' && activeOrder.status !== 'completed' && !isSuccessOpen && !isTrackingOpen && !isCheckoutOpen && !isCartOpen && !isAdminOpen && !isBannerDismissed && (
        <div
          style={{ bottom: '70px' }}
          className="fixed bottom-[70px] sm:bottom-6 left-3 right-3 sm:left-auto sm:right-6 sm:w-[410px] z-30 bg-slate-950/95 backdrop-blur-md text-white rounded-2xl shadow-2xl p-3 border-2 border-amber-400/80 shadow-emerald-950/50 animate-in slide-in-from-bottom-5"
        >
          {/* Top Row: Indicator + Order Ref + Total Amount + Dismiss Button */}
          <div className="flex items-center justify-between gap-2 pb-2 border-b border-slate-800">
            <div className="flex items-center gap-2 min-w-0">
              <span className={'w-2.5 h-2.5 rounded-full shrink-0 ' + (activeOrder.status === 'out_for_delivery' ? 'bg-amber-400 animate-pulse' : 'bg-emerald-400 animate-ping')} />
              <span className="text-[11px] text-slate-400 font-semibold shrink-0">Active:</span>
              <span className="font-mono font-black text-xs text-amber-300 tracking-wider truncate">{activeOrder.orderRef}</span>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <span className="font-mono font-black text-xs text-emerald-400">Rs. {activeOrder.totalAmount}/-</span>
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); setIsBannerDismissed(true); }}
                className="w-5 h-5 flex items-center justify-center text-slate-400 hover:text-white rounded-full hover:bg-slate-800 text-xs transition-colors"
                title="Dismiss banner"
              >
                ✕
              </button>
            </div>
          </div>

          {/* Bottom Row: Status Badge & Thumb-Friendly Action Buttons */}
          <div className="flex items-center justify-between gap-2 pt-2">
            <div className="text-[11px] text-slate-300 font-medium truncate min-w-0">
              {activeOrder.status === 'out_for_delivery' ? (
                <span className="text-amber-300 font-bold flex items-center gap-1">
                  <span>🛵</span>
                  <span className="truncate">Out for Delivery</span>
                </span>
              ) : (
                <span className="text-slate-300 flex items-center gap-1.5 capitalize truncate">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-400 shrink-0"></span>
                  <span className="truncate">{activeOrder.status ? activeOrder.status.replace(/_/g, ' ') : 'Pending Verification'}</span>
                </span>
              )}
            </div>

            <div className="flex items-center gap-2 shrink-0">
              {(activeOrder.status === 'pending_verification' || activeOrder.status === 'payment_verified') ? (
                <button
                  type="button"
                  onClick={() => {
                    setLatestOrder(activeOrder);
                    setIsSuccessOpen(true);
                  }}
                  className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 active:scale-95 text-white rounded-xl text-xs font-extrabold transition-all shadow-sm flex items-center gap-1"
                >
                  <span>❌</span>
                  <span>Cancel</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    setLatestOrder(activeOrder);
                    setIsSuccessOpen(true);
                  }}
                  className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white rounded-xl text-xs font-extrabold transition-all shadow-sm flex items-center gap-1"
                >
                  <span>📄</span>
                  <span>Slip</span>
                </button>
              )}

              <button
                type="button"
                onClick={() => {
                  setIsTrackingOpen(true);
                }}
                className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 active:scale-95 text-amber-200 border border-slate-600 rounded-xl text-xs font-bold transition-all flex items-center gap-1"
              >
                <span>🛵</span>
                <span>Track</span>
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
