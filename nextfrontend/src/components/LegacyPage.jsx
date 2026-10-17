"use client";

import { QueryClientProvider } from "@tanstack/react-query";
import { Suspense, useContext } from "react";
import { Toaster } from "@/components/ui/toaster";
import { PersistentToastProvider } from "@/components/ui/PersistentToast";
import StoreContactButton from "@/components/layout/StoreContactButton";
import { queryClientInstance } from "@/lib/query-client";
import { AuthProvider } from "@/lib/AuthContext";
import { Loader2 } from "lucide-react";
import { StoreChromeContext } from "@/components/layout/StoreChromeContext";
import StoreLoading from "@/components/layout/StoreLoading";
import Home from "@/legacy-pages/Home";
import Products from "@/legacy-pages/Products";
import ProductDetail from "@/legacy-pages/ProductDetail";
import Cart from "@/legacy-pages/Cart";
import Checkout from "@/legacy-pages/Checkout";
import Orders from "@/legacy-pages/Orders";
import Wishlist from "@/legacy-pages/Wishlist";
import Account from "@/legacy-pages/Account";
import Contact from "@/legacy-pages/Contact";
import FlashSales from "@/legacy-pages/FlashSales";
import FAQ from "@/legacy-pages/FAQ";
import Login from "@/legacy-pages/Login";
import Register from "@/legacy-pages/Register";
import ForgotPassword from "@/legacy-pages/ForgotPassword";
import ReturnPolicy from "@/legacy-pages/policy/ReturnPolicy";
import PrivacyPolicy from "@/legacy-pages/policy/PrivacyPolicy";
import Terms from "@/legacy-pages/policy/Terms";
import ShippingInfo from "@/legacy-pages/policy/ShippingInfo";
import SellerRegister from "@/legacy-pages/seller/SellerRegister";
import SellerDashboard from "@/legacy-pages/seller/SellerDashboard";
import SellerProducts from "@/legacy-pages/seller/SellerProducts";
import SellerInventory from "@/legacy-pages/seller/SellerInventory";
import SellerChats from "@/legacy-pages/seller/SellerChats";
import StorePage from "@/legacy-pages/StorePage";
import AdminDashboard from "@/legacy-pages/admin/AdminDashboard";
import AdminProducts from "@/legacy-pages/admin/AdminProducts";
import AdminOrders from "@/legacy-pages/admin/AdminOrders";
import AdminFlashSales from "@/legacy-pages/admin/AdminFlashSales";
import AdminCoupons from "@/legacy-pages/admin/AdminCoupons";
import AdminAnalytics from "@/legacy-pages/admin/AdminAnalytics";
import AdminSellers from "@/legacy-pages/admin/AdminSellers";
import AdminBanners from "@/legacy-pages/admin/AdminBanners";
import AdminSiteSettings from "@/legacy-pages/admin/AdminSiteSettings";
import AdminMessages from "@/legacy-pages/admin/AdminMessages";
import AdminReviews from "@/legacy-pages/admin/AdminReviews";
import AdminChats from "@/legacy-pages/admin/AdminChats";
import AdminFAQ from "@/legacy-pages/admin/AdminFAQ";
import AdminInventory from "@/legacy-pages/admin/AdminInventory";
import AdminUsers from "@/legacy-pages/admin/AdminUsers";
import AdminStaff from "@/legacy-pages/admin/AdminStaff";
import StaffDashboard from "@/legacy-pages/staff/StaffDashboard";

const pages = { Home, Products, ProductDetail, Cart, Checkout, Orders, Wishlist, Account, Contact, FlashSales, FAQ, Login, Register, ForgotPassword, ReturnPolicy, PrivacyPolicy, Terms, ShippingInfo, SellerRegister, SellerDashboard, SellerProducts, SellerInventory, SellerChats, StorePage, AdminDashboard, AdminProducts, AdminOrders, AdminFlashSales, AdminCoupons, AdminAnalytics, AdminSellers, AdminBanners, AdminSiteSettings, AdminMessages, AdminReviews, AdminChats, AdminFAQ, AdminInventory, AdminUsers, AdminStaff, StaffDashboard };

export default function LegacyPage({ page, initialData }) {
  const storeChrome = useContext(StoreChromeContext);
  const Page = pages[page];
  if (!Page) return null;

  const pageContent = (
    <Suspense fallback={storeChrome
      ? <StoreLoading />
      : <div className="flex min-h-screen items-center justify-center bg-background" role="status" aria-label="Loading page"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>}>
      <Page initialData={initialData} />
    </Suspense>
  );
  const showContactButton = ["Login", "Register", "ForgotPassword", "SellerRegister"].includes(page);

  if (storeChrome) return pageContent;

  return (
    <AuthProvider>
      <QueryClientProvider client={queryClientInstance}>
        <PersistentToastProvider>
          {pageContent}
          {showContactButton && <StoreContactButton />}
          <Toaster />
        </PersistentToastProvider>
      </QueryClientProvider>
    </AuthProvider>
  );
}
