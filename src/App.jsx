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

  // Modals
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [isSuccessOpen, setIsSuccessOpen] = useState(false);
  const [latestOrder, setLatestOrder] = useState(null);
  const [isTrackingOpen, setIsTrackingOpen] = useState(false);
  const [isAdminOpen, setIsAdminOpen] = useState(false);

  // Sync cart to localStorage
  useEffect(() => {
    try {
      localStorage.setItem('hyderi_cart', JSON.stringify(cartItems));
    } catch (e) {
      console.error(e);
    }
  }, [cartItems]);

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
        order={latestOrder}
        isOpen={isSuccessOpen}
        onClose={() => setIsSuccessOpen(false)}
        settings={settings}
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

    </div>
  );
}
