"use client";

import { useEffect, useMemo, useState } from "react";
import { QueryClientProvider } from "@tanstack/react-query";
import { AuthProvider } from "@/lib/AuthContext";
import { queryClientInstance } from "@/lib/query-client";
import { PersistentToastProvider } from "@/components/ui/PersistentToast";
import { Toaster } from "@/components/ui/toaster";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import StoreContactButton from "@/components/layout/StoreContactButton";
import StoreSideLinks from "@/components/layout/StoreSideLinks";
import { StoreChromeContext } from "@/components/layout/StoreChromeContext";

const readCart = () => {
  try {
    return JSON.parse(window.localStorage.getItem("cart") || "[]");
  } catch {
    return [];
  }
};

export default function StoreShell({ children }) {
  const [cart, setCart] = useState([]);
  const [wishlistCount, setWishlistCount] = useState(0);

  useEffect(() => {
    const syncCart = () => setCart(readCart());
    syncCart();
    window.addEventListener("open-market:cart-updated", syncCart);
    window.addEventListener("storage", syncCart);
    return () => {
      window.removeEventListener("open-market:cart-updated", syncCart);
      window.removeEventListener("storage", syncCart);
    };
  }, []);

  const chromeState = useMemo(() => ({ setWishlistCount }), []);

  return (
    <AuthProvider>
      <QueryClientProvider client={queryClientInstance}>
        <PersistentToastProvider>
          <StoreChromeContext.Provider value={chromeState}>
            <Navbar persistent cart={cart} wishlistCount={wishlistCount} />
            {children}
            <Footer persistent />
            <StoreSideLinks />
            <StoreContactButton />
            <Toaster />
          </StoreChromeContext.Provider>
        </PersistentToastProvider>
      </QueryClientProvider>
    </AuthProvider>
  );
}