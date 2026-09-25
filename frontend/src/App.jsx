import { Toaster } from "@/components/ui/toaster"
import { PersistentToastProvider } from "@/components/ui/PersistentToast"
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClientInstance } from '@/lib/query-client'
import { BrowserRouter as Router, Navigate, Route, Routes } from 'react-router-dom';
import PageNotFound from './lib/PageNotFound';
import { AuthProvider, useAuth } from '@/lib/AuthContext';
import RoleProtectedRoute from '@/components/RoleProtectedRoute';
import UserNotRegisteredError from '@/components/UserNotRegisteredError';

// Pages
import Home from './pages/Home';
import Products from './pages/Products';
import ProductDetail from './pages/ProductDetail';
import Cart from './pages/Cart';
import Checkout from './pages/Checkout';
import Orders from './pages/Orders.jsx';
import Wishlist from './pages/Wishlist';
import Account from './pages/Account';
import Contact from './pages/Contact';
import FlashSales from './pages/FlashSales';
import FAQ from './pages/FAQ';
import Login from './pages/Login';
import Register from './pages/Register';
import ForgotPassword from './pages/ForgotPassword';
import ReturnPolicy from './pages/policy/ReturnPolicy';
import PrivacyPolicy from './pages/policy/PrivacyPolicy';
import Terms from './pages/policy/Terms';
import ShippingInfo from './pages/policy/ShippingInfo';

// Seller Pages
import SellerRegister from './pages/seller/SellerRegister';
import SellerDashboard from './pages/seller/SellerDashboard';
import SellerProducts from './pages/seller/SellerProducts';

// Admin Pages
import AdminDashboard from './pages/admin/AdminDashboard';
import AdminProducts from './pages/admin/AdminProducts';
import AdminOrders from './pages/admin/AdminOrders';
import AdminFlashSales from './pages/admin/AdminFlashSales';
import AdminCoupons from './pages/admin/AdminCoupons';
import AdminAnalytics from './pages/admin/AdminAnalytics';
import AdminSellers from './pages/admin/AdminSellers';
import AdminBanners from './pages/admin/AdminBanners';
import AdminSiteSettings from './pages/admin/AdminSiteSettings';
import AdminMessages from './pages/admin/AdminMessages';
import AdminReviews from './pages/admin/AdminReviews';
import AdminChats from './pages/admin/AdminChats';
import AdminFAQ from './pages/admin/AdminFAQ';
import AdminInventory from './pages/admin/AdminInventory';
import SellerInventory from './pages/seller/SellerInventory';
import SellerChats from './pages/seller/SellerChats';
import StorePage from './pages/StorePage';
import AdminStaff from './pages/admin/AdminStaff';
import AdminUsers from './pages/admin/AdminUsers';
import StaffDashboard from './pages/staff/StaffDashboard';

const AuthenticatedApp = () => {
  const { isLoadingAuth, isLoadingPublicSettings, authError, navigateToLogin } = useAuth();

  if (isLoadingPublicSettings || isLoadingAuth) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center">
            <span className="text-white font-poppins font-black text-sm">OM</span>
          </div>
          <div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin"></div>
        </div>
      </div>
    );
  }

  if (authError && authError.type !== 'auth_required') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <div className="rounded-3xl border border-input bg-card p-8 shadow-xl max-w-lg w-full">
          <h1 className="text-2xl font-semibold mb-4">App error</h1>
          <p className="text-base leading-relaxed text-muted-foreground">{authError.message || 'Unable to load application state.'}</p>
        </div>
      </div>
    );
  }

  return (
    <Routes>
      {/* Store Routes */}
      <Route path="/" element={<Home />} />
      <Route path="/products" element={<Products />} />
      <Route path="/product/:id" element={<ProductDetail />} />
      <Route path="/cart" element={<Cart />} />
      <Route path="/checkout" element={<Checkout />} />
      <Route path="/orders" element={<Orders />} />
      <Route path="/wishlist" element={<Wishlist />} />
      <Route path="/account" element={<Account />} />
      <Route path="/contact" element={<Contact />} />
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route path="/flash-sales" element={<FlashSales />} />
      <Route path="/faq" element={<FAQ />} />
      <Route path="/policy/return" element={<ReturnPolicy />} />
      <Route path="/policy/privacy" element={<PrivacyPolicy />} />
      <Route path="/policy/terms" element={<Terms />} />
      <Route path="/policy/shipping" element={<ShippingInfo />} />

      {/* Seller Routes */}
      <Route path="/seller/register" element={<SellerRegister />} />
      <Route path="/seller/dashboard" element={<SellerDashboard />} />
      <Route path="/seller/products" element={<SellerProducts />} />

      {/* Admin Routes */}
      <Route element={<RoleProtectedRoute allowedRoles={['admin']} unauthorizedElement={<Navigate to="/" replace />} />}>
        <Route path="/admin" element={<AdminDashboard />} />
      </Route>
      <Route element={<RoleProtectedRoute allowedRoles={['admin', 'staff', 'employee']} unauthorizedElement={<Navigate to="/" replace />} />}>
        <Route path="/admin/products" element={<AdminProducts />} />
        <Route path="/admin/orders" element={<AdminOrders />} />
        <Route path="/admin/flash-sales" element={<AdminFlashSales />} />
        <Route path="/admin/coupons" element={<AdminCoupons />} />
        <Route path="/admin/analytics" element={<AdminAnalytics />} />
        <Route path="/admin/sellers" element={<AdminSellers />} />
        <Route path="/admin/banners" element={<AdminBanners />} />
        <Route path="/admin/settings" element={<AdminSiteSettings />} />
        <Route path="/admin/messages" element={<AdminMessages />} />
        <Route path="/admin/reviews" element={<AdminReviews />} />
        <Route path="/admin/chats" element={<AdminChats />} />
        <Route path="/admin/faq" element={<AdminFAQ />} />
        <Route path="/admin/inventory" element={<AdminInventory />} />
        <Route path="/admin/users" element={<AdminUsers />} />
        <Route path="/admin/staff" element={<AdminStaff />} />
      </Route>
      <Route path="/seller/inventory" element={<SellerInventory />} />
      <Route path="/seller/chats" element={<SellerChats />} />
      <Route path="/store/:sellerId" element={<StorePage />} />
      <Route element={<RoleProtectedRoute allowedRoles={['staff', 'employee']} unauthorizedElement={<Navigate to="/" replace />} />}>
        <Route path="/staff" element={<StaffDashboard />} />
      </Route>

      <Route path="*" element={<PageNotFound />} />
    </Routes>
  );
};

function App() {
  return (
    <AuthProvider>
      <QueryClientProvider client={queryClientInstance}>
        <PersistentToastProvider>
          <Router>
            <AuthenticatedApp />
          </Router>
          <Toaster />
        </PersistentToastProvider>
      </QueryClientProvider>
    </AuthProvider>
  )
}

export default App