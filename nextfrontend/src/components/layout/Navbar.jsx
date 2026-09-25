import { useState, useEffect } from "react";
import { Link, useNavigate } from "@/lib/next-router";
import { ShoppingCart, Heart, User, Menu, X, ChevronDown, Package, LayoutDashboard, Store, Zap } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { apiClient } from "@/api/apiClient";
import SearchSuggestions from "@/components/layout/SearchSuggestions";
import AnnouncementBar from "@/components/layout/AnnouncementBar";
import { useAppSettings } from "@/hooks/useAppSettings";
import FallbackImage from "@/components/ui/FallbackImage";
import { normalizeImageUrl } from "@/utils/imageUrls";
import { getCategoriesFromSettings } from "@/utils/categories";

export default function Navbar({ cart = [], wishlistCount = 0 }) {
  const settings = useAppSettings();
  const storeLogo = settings?.store_logo;
  const [mobileOpen, setMobileOpen] = useState(false);
  const [user, setUser] = useState(null);
  const [sellerStatus, setSellerStatus] = useState(null);
  const [isStaff, setIsStaff] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    apiClient.auth.me().then(u => {
      setUser(u);
      apiClient.entities.Seller.filter({ user_id: u.id }).then(s => { if (s.length) setSellerStatus(s[0].status); }).catch(() => {});
      if (u.role !== "admin") {
        apiClient.entities.StaffPermission.filter({ user_email: u.email, is_active: true })
          .then((perms) => {
            const hasActivePermissions = Array.isArray(perms) && perms.some((entry) => Array.isArray(entry.permissions) && entry.permissions.length > 0);
            setIsStaff(hasActivePermissions);
          })
          .catch(() => {});
      }
    }).catch(() => {});
  }, []);

  // Extract store name and logo from settings
  const storeName = settings?.store_name || "Open Market";
  const storeCountry = settings?.store_country || "Bangladesh";
  const categories = getCategoriesFromSettings(settings);

  return (
    <header className="sticky top-0 z-50 w-full shadow-md">
      {/* Announcement bar */}
      <AnnouncementBar />

      {/* Top bar */}
      <div className="bg-white border-b border-border">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center gap-4">
          {/* Logo */}
          <Link to="/" className="flex-shrink-0">
            <div className="flex items-center gap-2">
              {storeLogo ? (
                <FallbackImage src={normalizeImageUrl(storeLogo)} alt={storeName} className="w-9 h-9 rounded-lg object-contain bg-white p-1" fallback={
                  <div className="w-9 h-9 bg-primary rounded-lg flex items-center justify-center">
                    <span className="text-white font-poppins font-black text-sm">OM</span>
                  </div>
                } />
              ) : (
                <div className="w-9 h-9 bg-primary rounded-lg flex items-center justify-center">
                  <span className="text-white font-poppins font-black text-sm">OM</span>
                </div>
              )}
              <div className="hidden sm:block">
                <div className="font-poppins font-bold text-lg text-foreground leading-none">{storeName}</div>
                <div className="font-poppins text-[10px] text-primary font-semibold tracking-widest uppercase">{storeCountry}</div>
              </div>
            </div>
          </Link>

          {/* Search */}
          <div className="flex-1 max-w-2xl hidden sm:block">
            <SearchSuggestions />
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2 ml-auto sm:ml-0">
            <Link to="/wishlist" className="relative p-2 hover:text-primary transition-colors hidden sm:block">
              <Heart className="w-5 h-5" />
              {wishlistCount > 0 && <Badge className="absolute -top-1 -right-1 h-4 w-4 p-0 text-[10px] bg-primary flex items-center justify-center">{wishlistCount}</Badge>}
            </Link>
            <Link to="/cart" className="relative p-2 hover:text-primary transition-colors">
              <ShoppingCart className="w-5 h-5" />
              {cart.length > 0 && <Badge className="absolute -top-1 -right-1 h-4 w-4 p-0 text-[10px] bg-primary flex items-center justify-center">{cart.length}</Badge>}
            </Link>
            {sellerStatus === "approved" && user?.role !== "admin" && (
              <Link to="/seller/dashboard" className="hidden sm:flex items-center gap-1.5 text-xs font-medium bg-green-50 text-green-700 border border-green-200 px-3 py-1.5 rounded-lg hover:bg-green-600 hover:text-white hover:border-green-600 transition-colors">
                <Store className="w-3.5 h-3.5" />
                My Store
              </Link>
            )}
            {user?.role === "admin" && (
              <Link to="/admin" className="hidden sm:flex items-center gap-1.5 text-xs font-medium bg-primary/10 text-primary px-3 py-1.5 rounded-lg hover:bg-primary hover:text-white transition-colors">
                <LayoutDashboard className="w-3.5 h-3.5" />
                Admin
              </Link>
            )}
            {isStaff && user?.role !== "admin" && (
              <Link to="/staff" className="hidden sm:flex items-center gap-1.5 text-xs font-medium bg-primary/10 text-primary px-3 py-1.5 rounded-lg hover:bg-primary hover:text-white transition-colors">
                <LayoutDashboard className="w-3.5 h-3.5" />
                Staff Panel
              </Link>
            )}
            {user ? (
              <Link to="/account" className="hidden sm:flex items-center gap-1.5 text-sm font-medium hover:text-primary transition-colors">
                <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center overflow-hidden">
                  {user.profile_picture
                    ? <FallbackImage src={normalizeImageUrl(user.profile_picture)} alt="" className="w-full h-full object-cover" fallback={<User className="w-4 h-4 text-primary" />} />
                    : <User className="w-4 h-4 text-primary" />}
                </div>
                <span className="hidden lg:block">{user.full_name?.split(" ")[0]}</span>
              </Link>
            ) : (
              <Button onClick={() => apiClient.auth.redirectToLogin("/account")} size="sm" variant="outline" className="hidden sm:block text-sm border-primary text-primary hover:bg-primary hover:text-white">Login</Button>
            )}
            <button className="sm:hidden p-2" onClick={() => setMobileOpen(!mobileOpen)}>
              {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Mobile search */}
        <div className="sm:hidden px-4 pb-3">
          <SearchSuggestions className="w-full" />
        </div>
      </div>

      {/* Category nav */}
      <div className="bg-primary text-primary-foreground">
        <div className="max-w-7xl mx-auto px-4">
          <nav className="flex items-center gap-1 overflow-x-auto scrollbar-none">
            <Link to="/products" className="flex-shrink-0 px-3 py-2.5 text-xs font-medium hover:bg-white/20 transition-colors whitespace-nowrap flex items-center gap-1">
              All Products <ChevronDown className="w-3 h-3" />
            </Link>
            <Link to="/flash-sales" className="flex-shrink-0 px-3 py-2.5 text-xs font-bold hover:bg-white/20 transition-colors whitespace-nowrap flex items-center gap-1 text-yellow-300">
              <Zap className="w-3 h-3 fill-yellow-300" /> Flash Sales
            </Link>
            {categories.map((cat) => (
              <Link key={cat} to={`/products?main_category=${encodeURIComponent(cat)}`}
                className="flex-shrink-0 px-3 py-2.5 text-xs font-medium hover:bg-white/20 transition-colors whitespace-nowrap">
                {cat}
              </Link>
            ))}
          </nav>
        </div>
      </div>

      {/* Mobile menu */}
      {mobileOpen && (
        <div className="sm:hidden bg-white border-t border-border shadow-lg absolute w-full">
          <div className="p-4 space-y-2">
            {user ? (
              <Link to="/account" className="flex items-center gap-2 p-2 hover:bg-muted rounded-lg" onClick={() => setMobileOpen(false)}>
                <User className="w-4 h-4 text-primary" /> {user.full_name}
              </Link>
            ) : (
              <button onClick={() => { setMobileOpen(false); apiClient.auth.redirectToLogin("/account"); }} className="flex items-center gap-2 p-2 hover:bg-muted rounded-lg w-full text-left">
                <User className="w-4 h-4 text-primary" /> Login / Register
              </button>
            )}
            <Link to="/wishlist" className="flex items-center gap-2 p-2 hover:bg-muted rounded-lg" onClick={() => setMobileOpen(false)}>
              <Heart className="w-4 h-4 text-primary" /> Wishlist
            </Link>
            <Link to="/orders" className="flex items-center gap-2 p-2 hover:bg-muted rounded-lg" onClick={() => setMobileOpen(false)}>
              <Package className="w-4 h-4 text-primary" /> My Orders
            </Link>
            <Link to="/flash-sales" className="flex items-center gap-2 p-2 hover:bg-muted rounded-lg text-primary font-medium" onClick={() => setMobileOpen(false)}>
              <Zap className="w-4 h-4 text-primary" /> Flash Sales
            </Link>
            <Link to="/contact" className="flex items-center gap-2 p-2 hover:bg-muted rounded-lg" onClick={() => setMobileOpen(false)}>
              <Package className="w-4 h-4 text-primary" /> Contact
            </Link>
            {sellerStatus === "approved" && user?.role !== "admin" && (
              <Link to="/seller/dashboard" className="flex items-center gap-2 p-2 hover:bg-muted rounded-lg text-green-700 font-medium" onClick={() => setMobileOpen(false)}>
                <Store className="w-4 h-4 text-green-600" /> My Store
              </Link>
            )}
            {user?.role === "admin" && (
              <Link to="/admin" className="flex items-center gap-2 p-2 hover:bg-muted rounded-lg text-primary font-medium" onClick={() => setMobileOpen(false)}>
                <LayoutDashboard className="w-4 h-4 text-primary" /> Admin Dashboard
              </Link>
            )}
            {isStaff && user?.role !== "admin" && (
              <Link to="/staff" className="flex items-center gap-2 p-2 hover:bg-muted rounded-lg text-primary font-medium" onClick={() => setMobileOpen(false)}>
                <LayoutDashboard className="w-4 h-4 text-primary" /> Staff Panel
              </Link>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
