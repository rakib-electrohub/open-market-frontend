import { useState, useEffect, useRef } from "react";
import { apiClient } from "@/api/apiClient";
import { useToast } from "@/components/ui/use-toast";
import { useLocation } from "@/lib/next-router";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import ProductCard from "@/components/store/ProductCard";
import SEO from "@/components/SEO";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { SlidersHorizontal, X, Loader2 } from "lucide-react";
import { useAppSettings } from "@/hooks/useAppSettings";
import { buildWishlistItem } from "@/utils/wishlist";
import { getCategoriesFromSettings, getMainCategories, getSubCategories } from "@/utils/categories";

const SORT_OPTIONS = [
  { value: "popularity", label: "Popularity" },
  { value: "newest", label: "Newest First" },
  { value: "price_asc", label: "Price: Low to High" },
  { value: "price_desc", label: "Price: High to Low" },
  { value: "rating", label: "Top Rated" },
];
const PRODUCTS_PAGE_SIZE = 30;

const mergeUniqueProducts = (...lists) => {
  const seen = new Set();
  return lists.flat().filter((product) => {
    const identity = product?.id || `${product?.name || "product"}-${product?.created_date || "unknown"}`;
    if (seen.has(identity)) return false;
    seen.add(identity);
    return true;
  });
};

export default function Products() {
  const [products, setProducts] = useState([]);
  const [filtered, setFiltered] = useState([]);
  const [wishlist, setWishlist] = useState([]);
  const [userEmail, setUserEmail] = useState("");
  const [cart, setCart] = useState(() => { try { return JSON.parse(localStorage.getItem("cart") || "[]"); } catch { return []; } });
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [hasUserScrolled, setHasUserScrolled] = useState(false);
  const loadMoreRef = useRef(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const settings = useAppSettings();
  const maxPriceFilter = parseInt(settings.max_price_filter, 10) || 50000;
  const priceFilterDefaultEnabled = settings.price_filter_enabled === "true";

  const [sort, setSort] = useState("popularity");
  const [selectedMainCategory, setSelectedMainCategory] = useState("");
  const [selectedSubCategory, setSelectedSubCategory] = useState("");
  const [categoryOptions, setCategoryOptions] = useState([]);
  const [priceFilterEnabled, setPriceFilterEnabled] = useState(priceFilterDefaultEnabled);
  const [priceRange, setPriceRange] = useState([0, maxPriceFilter]);
  const [minRating, setMinRating] = useState(0);
  const [selectedBrands, setSelectedBrands] = useState([]);
  const [inStockOnly, setInStockOnly] = useState(false);
  const { toast } = useToast();

  const normalizePriceRange = ([min, max]) => {
    const safeMin = Math.max(0, Math.min(Number(min) || 0, maxPriceFilter));
    const safeMax = Math.max(safeMin, Math.min(Number(max) || 0, maxPriceFilter));
    return [safeMin, safeMax];
  };

  useEffect(() => {
    setPriceRange(prev => normalizePriceRange(prev));
  }, [maxPriceFilter]);

  useEffect(() => {
    setPriceFilterEnabled(settings.price_filter_enabled === "true");
  }, [settings.price_filter_enabled]);
  const location = useLocation();

  const urlParams = new URLSearchParams(location.search);
  const searchQuery = urlParams.get("search") || "";
  const categoryParam = urlParams.get("category") || "";
  const mainCategoryParam = urlParams.get("main_category") || "";
  const subCategoryParam = urlParams.get("subcategory") || "";
  const flashOnly = urlParams.get("flash") === "true";

  // Re-apply category from URL whenever the URL changes (e.g. clicking navbar category links)
  useEffect(() => {
    if (mainCategoryParam || subCategoryParam) {
      setSelectedMainCategory(mainCategoryParam);
      setSelectedSubCategory(subCategoryParam);
    } else if (categoryParam) {
      setSelectedMainCategory(categoryParam);
      setSelectedSubCategory("");
    } else {
      setSelectedMainCategory("");
      setSelectedSubCategory("");
    }
  }, [location.search]);

  useEffect(() => {
    Promise.all([
      apiClient.entities.Product.filter({ is_active: true, approval_status: "approved" }, "-sold_count", PRODUCTS_PAGE_SIZE, 0),
      apiClient.entities.Category.list("-created_date", 200),
      apiClient.auth.me().then(u => {
        setUserEmail(u.email);
        return apiClient.entities.Wishlist.filter({ created_by: u.email });
      }).catch(() => [])
    ]).then(([prods, categories, wish]) => {
      setProducts(mergeUniqueProducts(prods));
      setCategoryOptions(categories || []);
      setWishlist(wish);
      setHasMore(prods.length === PRODUCTS_PAGE_SIZE);
      setLoading(false);
    });
  }, []);

  useEffect(() => {
    const enableLoading = () => setHasUserScrolled(true);
    window.addEventListener("wheel", enableLoading, { passive: true, once: true });
    window.addEventListener("touchmove", enableLoading, { passive: true, once: true });
    window.addEventListener("keydown", enableLoading, { once: true });
    return () => {
      window.removeEventListener("wheel", enableLoading);
      window.removeEventListener("touchmove", enableLoading);
      window.removeEventListener("keydown", enableLoading);
    };
  }, []);

  useEffect(() => {
    const sentinel = loadMoreRef.current;
    if (!sentinel || !hasMore || !hasUserScrolled) return undefined;

    const loadMoreProducts = async () => {
      if (loading || loadingMore) return;
      setLoadingMore(true);
      try {
        const nextProducts = await apiClient.entities.Product.filter(
          { is_active: true, approval_status: "approved" },
          "-sold_count",
          PRODUCTS_PAGE_SIZE,
          products.length
        );
        setProducts(previous => mergeUniqueProducts(previous, nextProducts));
        setHasMore(nextProducts.length === PRODUCTS_PAGE_SIZE);
      } finally {
        setLoadingMore(false);
      }
    };

    const handleScroll = () => {
      if (window.scrollY <= 0 || sentinel.getBoundingClientRect().top > window.innerHeight) return;
      loadMoreProducts();
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    handleScroll();
    return () => window.removeEventListener("scroll", handleScroll);
  }, [hasMore, hasUserScrolled, loading, loadingMore, products.length]);

  useEffect(() => {
    let result = [...products];
    if (searchQuery) result = result.filter(p => p.name.toLowerCase().includes(searchQuery.toLowerCase()) || p.description?.toLowerCase().includes(searchQuery.toLowerCase()));
    if (selectedBrands.length) result = result.filter(p => selectedBrands.includes(p.brand));
    if (inStockOnly) result = result.filter(p => (p.stock || 0) > 0);
    if (selectedMainCategory) {
      result = result.filter((p) => {
        const mainName = p.main_category || p.category || "";
        const subName = p.subcategory || "";
        return mainName === selectedMainCategory || subName === selectedMainCategory;
      });
    }
    if (selectedSubCategory) {
      result = result.filter((p) => (p.subcategory || "") === selectedSubCategory);
    }
    if (flashOnly) result = result.filter(p => p.flash_sale_price && p.flash_sale_end && new Date(p.flash_sale_end) > new Date());
    if (priceFilterEnabled) result = result.filter(p => p.price >= priceRange[0] && p.price <= priceRange[1]);
    if (minRating > 0) result = result.filter(p => (p.average_rating || 0) >= minRating);

    if (sort === "newest") result.sort((a, b) => new Date(b.created_date) - new Date(a.created_date));
    else if (sort === "price_asc") result.sort((a, b) => a.price - b.price);
    else if (sort === "price_desc") result.sort((a, b) => b.price - a.price);
    else if (sort === "rating") result.sort((a, b) => (b.average_rating || 0) - (a.average_rating || 0));
    else result.sort((a, b) => (b.sold_count || 0) - (a.sold_count || 0));

    setFiltered(result);
  }, [products, searchQuery, selectedMainCategory, selectedSubCategory, flashOnly, priceFilterEnabled, priceRange, minRating, sort, selectedBrands, inStockOnly]);

  const handleAddToCart = (product) => {
    const existing = cart.find(c => c.product_id === product.id);
    const price = product.flash_sale_price && new Date(product.flash_sale_end) > new Date() ? product.flash_sale_price : product.price;
    const newCart = existing ? cart.map(c => c.product_id === product.id ? { ...c, quantity: c.quantity + 1 } : c)
      : [...cart, { product_id: product.id, product_name: product.name, product_image: product.images?.[0], quantity: 1, price }];
    setCart(newCart);
    localStorage.setItem("cart", JSON.stringify(newCart));
    toast({ title: "Added to cart!", description: product.name });
  };

  const handleAddToWishlist = async (product) => {
    const inWishlist = wishlist.find(w => w.product_id === product.id);
    if (inWishlist) {
      await apiClient.entities.Wishlist.delete(inWishlist.id);
      setWishlist(wishlist.filter(w => w.product_id !== product.id));
    } else {
      const email = userEmail || (await apiClient.auth.me().then(u => u.email).catch(() => ""));
      if (!email) {
        toast({ title: "Please login to add to wishlist", variant: "destructive" });
        return;
      }
      if (!userEmail) setUserEmail(email);
      const item = await apiClient.entities.Wishlist.create(buildWishlistItem(product, email));
      setWishlist([...wishlist, item]);
      toast({ title: "Added to wishlist!" });
    }
  };

  
  const toggleCategory = (cat) => {
    // legacy checkbox filter removed
  };
  const toggleBrand = (brand) => {
    setSelectedBrands(prev => prev.includes(brand) ? prev.filter(b => b !== brand) : [...prev, brand]);
  };
  const availableBrands = [...new Set(products.map(p => p.brand).filter(Boolean))].sort();

  const categories = getCategoriesFromSettings(settings);
  const mainCategories = getMainCategories(categoryOptions.length ? categoryOptions : categories.map((name) => ({ id: name, name, parent_id: null })));
  const subCategories = selectedMainCategory ? getSubCategories(categoryOptions, mainCategories.find((cat) => cat.name === selectedMainCategory)?.id) : [];
  const sidebarContent = (
    <div className="space-y-6">
      {/* Categories */}
      <div>
        <h3 className="font-semibold text-sm mb-3">Categories</h3>
        <div className="space-y-2">
          <label className="flex flex-col gap-1 text-sm">
            <span className="text-muted-foreground">Main Category</span>
            <select value={selectedMainCategory} onChange={(e) => { setSelectedMainCategory(e.target.value); setSelectedSubCategory(""); }} className="rounded-lg border border-border bg-background px-3 py-2 text-sm">
              <option value="">All categories</option>
              {mainCategories.map((cat) => <option key={cat.id || cat.name} value={cat.name}>{cat.name}</option>)}
            </select>
          </label>
          {selectedMainCategory && subCategories.length > 0 && (
            <label className="flex flex-col gap-1 text-sm">
              <span className="text-muted-foreground">Sub Category</span>
              <select value={selectedSubCategory} onChange={(e) => setSelectedSubCategory(e.target.value)} className="rounded-lg border border-border bg-background px-3 py-2 text-sm">
                <option value="">All sub categories</option>
                {subCategories.map((cat) => <option key={cat.id || cat.name} value={cat.name}>{cat.name}</option>)}
              </select>
            </label>
          )}
          {selectedMainCategory && subCategories.length === 0 && (
            <p className="text-xs text-muted-foreground">No sub categories available for this main category.</p>
          )}
          {/* legacy checkbox category filter removed */}
        </div>
      </div>

      {/* Price Range */}
      <div className={`rounded-xl p-4 transition-colors ${priceFilterEnabled ? "bg-background border border-border" : "bg-slate-950 border border-border/40"}`}>
        <div className="flex items-center justify-between mb-3">
          <div>
            <h3 className="font-semibold text-sm">Price Range</h3>
            <p className="text-[11px] text-muted-foreground">Admin-defined max: ৳{maxPriceFilter.toLocaleString()}</p>
          </div>
          <label className="flex items-center gap-2 text-sm cursor-pointer select-none">
            <input type="checkbox" checked={priceFilterEnabled} onChange={(e) => setPriceFilterEnabled(e.target.checked)} className="accent-primary" />
            Enable
          </label>
        </div>
        <div className="grid gap-2 sm:grid-cols-2 mb-3">
          <label className="flex flex-col text-sm text-muted-foreground">
            Min price
            <input
              type="number"
              value={priceRange[0]}
              min={0}
              max={priceRange[1]}
              onChange={(e) => setPriceRange(normalizePriceRange([e.target.value, priceRange[1]]))}
              className="mt-1 rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground"
            />
          </label>
          <label className="flex flex-col text-sm text-muted-foreground">
            Max price
            <input
              type="number"
              value={priceRange[1]}
              min={priceRange[0]}
              max={maxPriceFilter}
              onChange={(e) => setPriceRange(normalizePriceRange([priceRange[0], e.target.value]))}
              className="mt-1 rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground"
            />
          </label>
        </div>
        <Slider value={priceRange} onValueChange={(value) => setPriceRange(normalizePriceRange(value))} min={0} max={maxPriceFilter} step={100} disabled={!priceFilterEnabled} className="mb-2" />
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>৳{priceRange[0].toLocaleString()}</span>
          <span>৳{priceRange[1].toLocaleString()}</span>
        </div>
        {!priceFilterEnabled && <p className="mt-2 text-xs text-muted-foreground">Price range is currently disabled. Enable to apply.</p>}
      </div>

      {/* Rating */}
      <div>
        <h3 className="font-semibold text-sm mb-3">Min Rating</h3>
        <div className="flex gap-2">
          {[0, 3, 4, 4.5].map(r => (
            <button key={r} onClick={() => setMinRating(r)}
              className={`text-xs px-2 py-1 rounded border transition-colors ${minRating === r ? "border-primary bg-primary/10 text-primary" : "border-border hover:border-primary/50"}`}>
              {r === 0 ? "All" : `${r}★+`}
            </button>
          ))}
        </div>
      </div>

      {/* Brand Filter */}
      {availableBrands.length > 0 && (
        <div>
          <h3 className="font-semibold text-sm mb-3">Brand</h3>
          <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
            {availableBrands.map(brand => (
              <label key={brand} className="flex items-center gap-2 cursor-pointer group">
                <input type="checkbox" checked={selectedBrands.includes(brand)} onChange={() => toggleBrand(brand)} className="accent-primary" />
                <span className="text-sm group-hover:text-primary transition-colors">{brand}</span>
              </label>
            ))}
          </div>
        </div>
      )}

      {/* In Stock */}
      <div>
        <h3 className="font-semibold text-sm mb-3">Availability</h3>
        <label className="flex items-center gap-2 cursor-pointer group">
          <input type="checkbox" checked={inStockOnly} onChange={e => setInStockOnly(e.target.checked)} className="accent-primary" />
          <span className="text-sm group-hover:text-primary transition-colors">In Stock Only</span>
        </label>
      </div>

      <Button variant="outline" size="sm" className="w-full" onClick={() => { setSelectedMainCategory(""); setSelectedSubCategory(""); setPriceRange([0, maxPriceFilter]); setPriceFilterEnabled(priceFilterDefaultEnabled); setMinRating(0); setSelectedBrands([]); setInStockOnly(false); }}>
        <X className="w-3 h-3 mr-1" /> Clear Filters
      </Button>
    </div>
  );

  return (
    <div className="min-h-screen bg-background">
      <SEO
        title={searchQuery ? `Search results for ${searchQuery} | Open Market BD` : "Products | Open Market BD"}
        description="Browse approved products from trusted sellers on Open Market BD. Shop electronics, fashion, home goods, and more."
        canonicalPath="/products"
      />
      <Navbar cart={cart} wishlistCount={wishlist.length} />
      <main className="max-w-7xl mx-auto px-4 py-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="font-poppins font-bold text-2xl">{searchQuery ? `Results for "${searchQuery}"` : flashOnly ? "Flash Sales" : "All Products"}</h1>
            <p className="text-muted-foreground text-sm mt-1">{filtered.length} products found</p>
          </div>
          <div className="flex items-center gap-3">
                    <button onClick={() => setSidebarOpen(!sidebarOpen)} className="lg:hidden flex items-center gap-2 text-sm border border-border px-3 py-2 rounded-lg hover:border-primary/50">
                      <SlidersHorizontal className="w-4 h-4" /> Filters
                      {((selectedMainCategory ? 1 : 0) + (selectedSubCategory ? 1 : 0) + (minRating > 0 ? 1 : 0) + (selectedBrands.length ? 1 : 0) + (inStockOnly ? 1 : 0) + (priceFilterEnabled ? 1 : 0)) > 0 && (
                        <Badge className="bg-primary text-white h-4 w-4 p-0 text-[10px] flex items-center justify-center">{(selectedMainCategory ? 1 : 0) + (selectedSubCategory ? 1 : 0) + (minRating > 0 ? 1 : 0) + (selectedBrands.length ? 1 : 0) + (inStockOnly ? 1 : 0) + (priceFilterEnabled ? 1 : 0)}</Badge>
                      )}
                    </button>
            <div className="flex items-center gap-2 border border-border rounded-lg px-3 py-2">
              <span className="text-xs text-muted-foreground">Sort:</span>
              <select value={sort} onChange={e => setSort(e.target.value)} className="text-sm bg-transparent focus:outline-none">
                {SORT_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </div>
          </div>
        </div>

        <div className="flex gap-6">
          {/* Desktop sidebar */}
          <aside className="hidden lg:block w-56 flex-shrink-0 bg-white rounded-xl border border-border p-4 h-fit sticky top-32">
            {sidebarContent}
          </aside>

          {/* Mobile sidebar overlay */}
          {sidebarOpen && (
            <div className="lg:hidden fixed inset-0 z-50 bg-black/40" onClick={() => setSidebarOpen(false)}>
              <div className="absolute left-0 top-0 h-full w-72 bg-white p-4 overflow-y-auto" onClick={e => e.stopPropagation()}>
              <div className="flex justify-between mb-4"><h2 className="font-semibold">Filters</h2><button onClick={() => setSidebarOpen(false)}><X className="w-5 h-5" /></button></div>
              {sidebarContent}
              </div>
            </div>
          )}

          {/* Products grid */}
          <div className="flex-1">
            {loading ? (
              <div className="flex items-center justify-center h-64">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
              </div>
            ) : filtered.length === 0 ? (
              <div className="text-center py-20">
                <p className="text-muted-foreground text-lg">No products found.</p>
                <Button variant="outline" className="mt-4" onClick={() => { setSelectedMainCategory(""); setSelectedSubCategory(""); setPriceRange([0, maxPriceFilter]); setPriceFilterEnabled(priceFilterDefaultEnabled); setMinRating(0); }}>Clear Filters</Button>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
                {filtered.map((p, index) => (
                  <ProductCard key={p.id || `${p.name || "product"}-${p.created_date || index}`} product={p} onAddToCart={handleAddToCart} onAddToWishlist={handleAddToWishlist} isWishlisted={wishlist.some(w => w.product_id === p.id)} />
                ))}
              </div>
            )}
            <div ref={loadMoreRef} aria-hidden="true" className="h-1" />
            {loadingMore && <div className="flex justify-center py-6"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>}
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
