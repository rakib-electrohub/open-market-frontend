import { useState, useEffect, useRef } from "react";
import { apiClient } from "@/api/apiClient";
import { persistCart } from "@/utils/cart";
import { usePersistentToast } from "@/components/ui/PersistentToast";
import { buildWishlistItem } from "@/utils/wishlist";

import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import StoreContactButton from "@/components/layout/StoreContactButton";
import StoreSideLinks from "@/components/layout/StoreSideLinks";
import HeroBanner from "@/components/store/HeroBanner";
import CategoryGrid from "@/components/store/CategoryGrid";
import FlashSaleSection from "@/components/store/FlashSaleSection";
import ProductSection from "@/components/store/ProductSection";
import SEO from "@/components/SEO";
import { BadgeCheck, Shield, Printer, Headphones } from "lucide-react";
import { Link } from "@/lib/next-router";
import AnimatedSection from "@/components/ui/AnimatedSection";
import { useAppSettings } from "@/hooks/useAppSettings";
import { buildOrganizationSchema, buildWebsiteSchema } from "@/lib/seo";
import { getSafeHttpUrl } from "@/utils/urls";

const mergeUniqueProducts = (...lists) => {
  const seen = new Set();
  return lists.flat().filter((product) => {
    if (!product?.id || seen.has(product.id)) return false;
    seen.add(product.id);
    return true;
  });
};

const FLASH_PRODUCT_BATCH_SIZE = 25;
const FLASH_PRODUCT_BATCH_LIMIT = 4;
const isActiveFlashProduct = (product) =>
  product.flash_sale_price &&
  product.flash_sale_end &&
  new Date(product.flash_sale_end) > new Date();

async function fetchFlashProducts(offset = 0, targetCount = 5) {
  const products = [];
  let nextOffset = offset;
  let hasMore = false;

  for (let batch = 0; batch < FLASH_PRODUCT_BATCH_LIMIT && products.length < targetCount; batch += 1) {
    const candidates = await apiClient.entities.Product.filter(
      { is_active: true, approval_status: "approved" },
      "-flash_sale_end",
      FLASH_PRODUCT_BATCH_SIZE,
      nextOffset
    );
    let consumed = candidates.length;
    for (const [index, product] of candidates.entries()) {
      if (isActiveFlashProduct(product)) {
        products.push(product);
        if (products.length === targetCount) {
          consumed = index + 1;
          break;
        }
      }
    }
    nextOffset += consumed;
    hasMore = consumed < candidates.length || candidates.length === FLASH_PRODUCT_BATCH_SIZE;
    if (products.length === targetCount) break;
    if (!hasMore) break;
  }

  return { products: products.slice(0, targetCount), offset: nextOffset, hasMore };
}

export default function Home({ initialData }) {
  const hasInitialData = Boolean(initialData);
  const [products, setProducts] = useState(() => mergeUniqueProducts(initialData?.featured, initialData?.newest, initialData?.trending));
  const [flashProducts, setFlashProducts] = useState(() => mergeUniqueProducts(initialData?.flashProducts));
  const [hasMoreFlashProducts, setHasMoreFlashProducts] = useState(() => Boolean(initialData?.flashProductsHasMore));
  const [loadingMoreFlashProducts, setLoadingMoreFlashProducts] = useState(false);
  const flashOffsetRef = useRef(initialData?.flashProductsOffset || 0);
  const flashLoadInProgressRef = useRef(false);
  const [banners, setBanners] = useState(() => initialData?.banners || []);
  const [wishlist, setWishlist] = useState([]);
  const [userEmail, setUserEmail] = useState("");
  const [cart, setCart] = useState(() => {
    try { return JSON.parse(localStorage.getItem("cart") || "[]"); } catch { return []; }
  });
  const [loading, setLoading] = useState(true);
  const notify = usePersistentToast();
  const settings = useAppSettings();
  const homeProductLimit = Math.min(20, Math.max(1, Number(settings.home_products_limit) || 10));
  const printingServiceUrl = getSafeHttpUrl(settings.printing_service_url);

  useEffect(() => {
    if (hasInitialData) {
      setLoading(false);
      return undefined;
    }

    Promise.all([
      apiClient.entities.Product.filter({ is_active: true, approval_status: "approved", is_featured: true }, "-created_date", homeProductLimit),
      apiClient.entities.Product.filter({ is_active: true, approval_status: "approved" }, "-created_date", homeProductLimit),
      apiClient.entities.Product.filter({ is_active: true, approval_status: "approved" }, "-sold_count", homeProductLimit),
      fetchFlashProducts(),
      apiClient.entities.Banner.filter({ is_active: true, position: "hero" }, "sort_order").catch(() => []),
      
      apiClient.auth.me().then(user => {
        setUserEmail(user.email);

        return apiClient.entities.Wishlist.filter({
          created_by: user.email
        });
      }).catch(() => [])

    ]).then(([featuredProducts, newestProducts, trendingProducts, fetchedFlashSale, fetchedBanners, wish]) => {
      setProducts(mergeUniqueProducts(featuredProducts, newestProducts, trendingProducts));
      setFlashProducts(mergeUniqueProducts(fetchedFlashSale.products));
      flashOffsetRef.current = fetchedFlashSale.offset;
      setHasMoreFlashProducts(fetchedFlashSale.hasMore);
      setBanners(fetchedBanners);
      setWishlist(wish);
      setLoading(false);
    });
  }, [hasInitialData, homeProductLimit]);

  const handleLoadMoreFlashProducts = async () => {
    if (!hasMoreFlashProducts || flashLoadInProgressRef.current) return;
    flashLoadInProgressRef.current = true;
    setLoadingMoreFlashProducts(true);

    try {
      const fetchedFlashSale = await fetchFlashProducts(flashOffsetRef.current);
      flashOffsetRef.current = fetchedFlashSale.offset;
      setFlashProducts((current) => mergeUniqueProducts(current, fetchedFlashSale.products));
      setHasMoreFlashProducts(fetchedFlashSale.hasMore);
    } catch (error) {
      notify?.(error.message || "Could not load more flash sale products", "destructive");
    } finally {
      flashLoadInProgressRef.current = false;
      setLoadingMoreFlashProducts(false);
    }
  };

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
    persistCart(newCart);
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
  const homepageStructuredData = [buildWebsiteSchema(), buildOrganizationSchema(initialData?.settings || settings)];

  return (
    <div className="min-h-screen bg-background">
      <SEO
        title="Open Market | Trusted Online Marketplace"
        description="Shop top products, trending deals, and trusted seller picks on Open Market with fast delivery and secure checkout."
        canonicalPath="/"
        structuredData={homepageStructuredData}
        image="/og-default.svg"
      />
      <Navbar cart={cart} wishlistCount={wishlist.length} />
      <main className="max-w-7xl mx-auto px-4 py-6 space-y-10">
        {/* Hero */}
        <HeroBanner banners={banners} />

        <AnimatedSection animation="fade-up">
          <div className="bg-white border border-border rounded-2xl p-5 sm:p-6 shadow-sm">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 text-primary px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] mb-3">
                  {settings.home_intro_eyebrow ?? "Why shoppers choose us"}
                </div>
                <h1 className="font-poppins font-bold text-2xl sm:text-3xl text-foreground">{settings.home_intro_title ?? "Your trusted marketplace for smarter shopping"}</h1>
              </div>
              <p className="text-sm text-muted-foreground max-w-xl">
                {settings.home_intro_description ?? "Discover premium essentials, trending products, and verified sellers in one secure shopping destination built for speed, value, and confidence."}
              </p>
            </div>
          </div>
        </AnimatedSection>

        {/* Trust badges */}
        <AnimatedSection animation="fade-up">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {[
              { icon: Printer, label: settings.home_benefit_1_title ?? "3D Printing Service", sub: settings.home_benefit_1_description ?? "Custom 3D printing solutions", href: printingServiceUrl },
              { icon: Shield, label: settings.home_benefit_2_title ?? "Secure Payment", sub: settings.home_benefit_2_description ?? "100% protected" },
              {
                icon: BadgeCheck,
                label: settings.home_benefit_3_title === "Easy Returns" ? "Product Tested" : settings.home_benefit_3_title || "Product Tested",
                sub: settings.home_benefit_3_description === "7-day return policy"
                  ? "Every product is tested before delivery"
                  : settings.home_benefit_3_description || "Every product is tested before delivery",
              },
              {
                icon: Headphones,
                label: settings.home_benefit_4_title === "24/7 Support" ? "Contact Us" : settings.home_benefit_4_title || "Contact Us",
                sub: settings.contact_hours ? `Available ${settings.contact_hours}` : "Contact us during business hours",
                href: "/contact",
              },
            ].map(({ icon: Icon, label, sub, href }, i) => {
              const content = (
                <div className="bg-white rounded-xl p-4 flex items-center gap-3 border border-border hover:border-primary/30 transition-colors h-full">
                  <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center flex-shrink-0">
                    <Icon className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <div className="font-semibold text-sm text-foreground">{label}</div>
                    <div className="text-xs text-muted-foreground">{sub}</div>
                  </div>
                </div>
              );

              return (
                <AnimatedSection key={label} animation="scale-up" delay={i * 80}>
                  {href && href !== "/contact" ? (
                    <a href={href} target="_blank" rel="noopener noreferrer" className="block h-full">
                      {content}
                    </a>
                  ) : href === "/contact" ? (
                    <Link to="/contact" className="block h-full">{content}</Link>
                  ) : content}
                </AnimatedSection>
              );
            })}
          </div>
        </AnimatedSection>

        {/* Categories */}
        <AnimatedSection animation="fade-up">
          <CategoryGrid initialCategories={initialData?.categories || []} />
        </AnimatedSection>

        {/* Flash Sale */}
        <AnimatedSection animation="fade-up">
          <FlashSaleSection
            products={flashProducts}
            hasMoreProducts={hasMoreFlashProducts}
            loadingMoreProducts={loadingMoreFlashProducts}
            onLoadMoreProducts={handleLoadMoreFlashProducts}
            onAddToCart={handleAddToCart}
            onAddToWishlist={handleAddToWishlist}
            wishlist={wishlist}
          />
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
      <StoreSideLinks />
      <StoreContactButton />
    </div>
  );
}
