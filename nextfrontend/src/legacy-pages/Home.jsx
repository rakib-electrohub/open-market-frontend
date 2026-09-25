import { useState, useEffect } from "react";
import { apiClient } from "@/api/apiClient";
import { usePersistentToast } from "@/components/ui/PersistentToast";
import { buildWishlistItem } from "@/utils/wishlist";

import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import HeroBanner from "@/components/store/HeroBanner";
import CategoryGrid from "@/components/store/CategoryGrid";
import FlashSaleSection from "@/components/store/FlashSaleSection";
import ProductSection from "@/components/store/ProductSection";
import { Shield, Truck, RefreshCcw, Headphones } from "lucide-react";
import AnimatedSection from "@/components/ui/AnimatedSection";
import { useAppSettings } from "@/hooks/useAppSettings";

const mergeUniqueProducts = (...lists) => {
  const seen = new Set();
  return lists.flat().filter((product) => {
    if (!product?.id || seen.has(product.id)) return false;
    seen.add(product.id);
    return true;
  });
};

export default function Home() {
  const [products, setProducts] = useState([]);
  const [flashProducts, setFlashProducts] = useState([]);
  const [banners, setBanners] = useState([]);
  const [wishlist, setWishlist] = useState([]);
  const [userEmail, setUserEmail] = useState("");
  const [cart, setCart] = useState(() => {
    try { return JSON.parse(localStorage.getItem("cart") || "[]"); } catch { return []; }
  });
  const [loading, setLoading] = useState(true);
  const notify = usePersistentToast();
  const settings = useAppSettings();
  const homeProductLimit = Math.min(20, Math.max(1, Number(settings.home_products_limit) || 10));

  useEffect(() => {
    Promise.all([
      apiClient.entities.Product.filter({ is_active: true, approval_status: "approved", is_featured: true }, "-created_date", homeProductLimit),
      apiClient.entities.Product.filter({ is_active: true, approval_status: "approved" }, "-created_date", homeProductLimit),
      apiClient.entities.Product.filter({ is_active: true, approval_status: "approved" }, "-sold_count", homeProductLimit),
      apiClient.entities.Product.filter({ is_active: true, approval_status: "approved" }, "-flash_sale_end", homeProductLimit),
      apiClient.entities.Banner.filter({ is_active: true, position: "hero" }, "sort_order").catch(() => []),
      
      apiClient.auth.me().then(user => {
        setUserEmail(user.email);

        return apiClient.entities.Wishlist.filter({
          created_by: user.email
        });
      }).catch(() => [])

    ]).then(([featuredProducts, newestProducts, trendingProducts, flashProducts, fetchedBanners, wish]) => {
      setProducts(mergeUniqueProducts(featuredProducts, newestProducts, trendingProducts));
      setFlashProducts(mergeUniqueProducts(flashProducts));
      setBanners(fetchedBanners);
      setWishlist(wish);
      setLoading(false);
    });
  }, [homeProductLimit]);

  const handleAddToCart = (product) => {
    const existing = cart.find(c => c.product_id === product.id);
    let newCart;
    if (existing) {
      newCart = cart.map(c => c.product_id === product.id ? { ...c, quantity: c.quantity + 1 } : c);
    } else {
      const price = product.flash_sale_price && new Date(product.flash_sale_end) > new Date() ? product.flash_sale_price : product.price;
      newCart = [...cart, { product_id: product.id, product_name: product.name, product_image: product.images?.[0], quantity: 1, price }];
    }
    setCart(newCart);
    localStorage.setItem("cart", JSON.stringify(newCart));
    notify?.("Added to cart: " + product.name, "success");
  };

  // const handleAddToWishlist = async (product) => {
  //   const inWishlist = wishlist.find(w => w.product_id === product.id);
  //   if (inWishlist) {
  //     await apiClient.entities.Wishlist.delete(inWishlist.id);
  //     setWishlist(wishlist.filter(w => w.product_id !== product.id));
  //     notify?.("Removed from wishlist", "delete");
  //   } else {
  //     const item = await apiClient.entities.Wishlist.create({ product_id: product.id, product_name: product.name, product_image: product.images?.[0], product_price: product.price });
  //     setWishlist([...wishlist, item]);
  //     notify?.("Added to wishlist: " + product.name, "success");
  //   }
  // };

  const handleAddToWishlist = async (product) => {
    const inWishlist = wishlist.find(
      w => w.product_id === product.id
    );

    if (inWishlist) {
      await apiClient.entities.Wishlist.delete(
        inWishlist.id
      );

      setWishlist(prev =>
        prev.filter(
          w => w.product_id !== product.id
        )
      );

      notify?.("Removed from wishlist", "delete");
    } else {
      const email =
        userEmail ||
        (await apiClient.auth
          .me()
          .then(u => u.email)
          .catch(() => ""));

      if (!email) {
        notify?.(
          "Please login to add to wishlist",
          "destructive"
        );
        return;
      }

      if (!userEmail) {
        setUserEmail(email);
      }

      const item =
        await apiClient.entities.Wishlist.create(
          buildWishlistItem(product, email)
        );

      setWishlist(prev => [...prev, item]);

      notify?.(
        "Added to wishlist: " + product.name,
        "success"
      );
    }
  };

  const featured = products.filter(p => p.is_featured).slice(0, homeProductLimit);
  const newest = [...products].sort((a, b) => new Date(b.created_date) - new Date(a.created_date)).slice(0, homeProductLimit);
  const trending = [...products].sort((a, b) => (b.sold_count || 0) - (a.sold_count || 0)).slice(0, homeProductLimit);

  return (
    <div className="min-h-screen bg-background">
      <Navbar cart={cart} wishlistCount={wishlist.length} />
      <main className="max-w-7xl mx-auto px-4 py-6 space-y-10">
        {/* Hero */}
        <HeroBanner banners={banners} />

        {/* Trust badges */}
        <AnimatedSection animation="fade-up">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {[
              { icon: Truck, label: "Free Delivery", sub: "On orders above ৳999" },
              { icon: Shield, label: "Secure Payment", sub: "100% protected" },
              { icon: RefreshCcw, label: "Easy Returns", sub: "7-day return policy" },
              { icon: Headphones, label: "24/7 Support", sub: "Dedicated support team" },
            ].map(({ icon: Icon, label, sub }, i) => (
              <AnimatedSection key={label} animation="scale-up" delay={i * 80}>
                <div className="bg-white rounded-xl p-4 flex items-center gap-3 border border-border hover:border-primary/30 transition-colors h-full">
                  <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center flex-shrink-0">
                    <Icon className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <div className="font-semibold text-sm text-foreground">{label}</div>
                    <div className="text-xs text-muted-foreground">{sub}</div>
                  </div>
                </div>
              </AnimatedSection>
            ))}
          </div>
        </AnimatedSection>

        {/* Categories */}
        <AnimatedSection animation="fade-up">
          <CategoryGrid />
        </AnimatedSection>

        {/* Flash Sale */}
        <AnimatedSection animation="fade-up">
          <FlashSaleSection products={flashProducts} onAddToCart={handleAddToCart} onAddToWishlist={handleAddToWishlist} wishlist={wishlist} />
        </AnimatedSection>

        {/* Featured */}
        {featured.length > 0 && (
          <AnimatedSection animation="fade-up">
            <ProductSection title="Featured Products" products={featured} viewAllLink="/products?featured=true"
              onAddToCart={handleAddToCart} onAddToWishlist={handleAddToWishlist} wishlist={wishlist} badge="HOT" />
          </AnimatedSection>
        )}

        {/* Trending */}
        <AnimatedSection animation="fade-up">
          <ProductSection title="🔥 Trending Now" products={trending} viewAllLink="/products"
            onAddToCart={handleAddToCart} onAddToWishlist={handleAddToWishlist} wishlist={wishlist} />
        </AnimatedSection>

        {/* New Arrivals */}
        <AnimatedSection animation="fade-up">
          <ProductSection title="✨ New Arrivals" products={newest} viewAllLink="/products?sort=newest"
            onAddToCart={handleAddToCart} onAddToWishlist={handleAddToWishlist} wishlist={wishlist} />
        </AnimatedSection>
      </main>
      <Footer />
    </div>
  );
}

