import { useState, useEffect } from "react";
import { useParams, Link } from "@/lib/next-router";
import { apiClient } from "@/api/apiClient";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import ProductCard from "@/components/store/ProductCard";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Store, Package, Star, MapPin, Phone, Mail, Shield, Loader2, ChevronRight } from "lucide-react";
import { usePersistentToast } from "@/components/ui/PersistentToast";

export default function StorePage() {
  const { sellerId } = useParams();
  const [seller, setSeller] = useState(null);
  const [products, setProducts] = useState([]);
  const [reviews, setReviews] = useState([]);
  const [wishlist, setWishlist] = useState([]);
  const [cart, setCart] = useState(() => { try { return JSON.parse(localStorage.getItem("cart") || "[]"); } catch { return []; } });
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState("all");
  const [sort, setSort] = useState("newest");
  const notify = usePersistentToast();

  useEffect(() => {
    Promise.all([
      apiClient.entities.Seller.get(sellerId).catch(() => null),
      apiClient.entities.Product.filter({ seller_id: sellerId, is_active: true, approval_status: "approved" }, "-created_date"),
      apiClient.auth.me().then(u => apiClient.entities.Wishlist.filter({ created_by: u.email })).catch(() => []),
    ]).then(([sellerResult, prods, wish]) => {
      if (sellerResult) setSeller(sellerResult);
      setProducts(prods);
      setWishlist(wish);
      // fetch reviews for all products
      if (prods.length) {
        const productIds = prods.map(p => p.id);
        Promise.all(productIds.map(id => apiClient.entities.Review.filter({ product_id: id, is_approved: true }).catch(() => [])))
          .then(results => setReviews(results.flat()));
      }
      setLoading(false);
    });
  }, [sellerId]);

  const handleAddToCart = (product) => {
    const existing = cart.find(c => c.product_id === product.id);
    const price = product.flash_sale_price && new Date(product.flash_sale_end) > new Date() ? product.flash_sale_price : product.price;
    const newCart = existing
      ? cart.map(c => c.product_id === product.id ? { ...c, quantity: c.quantity + 1 } : c)
      : [...cart, { product_id: product.id, product_name: product.name, product_image: product.images?.[0], quantity: 1, price }];
    setCart(newCart);
    localStorage.setItem("cart", JSON.stringify(newCart));
    notify?.("Added to cart: " + product.name, "success");
  };

  const handleAddToWishlist = async (product) => {
    const inWishlist = wishlist.find(w => w.product_id === product.id);
    if (inWishlist) {
      await apiClient.entities.Wishlist.delete(inWishlist.id);
      setWishlist(wishlist.filter(w => w.product_id !== product.id));
    } else {
      const item = await apiClient.entities.Wishlist.create({ product_id: product.id, product_name: product.name, product_image: product.images?.[0], product_price: product.price });
      setWishlist([...wishlist, item]);
    }
  };

  const categories = ["all", ...new Set(products.map(p => p.category).filter(Boolean))];

  const filtered = products
    .filter(p => activeCategory === "all" || p.category === activeCategory)
    .sort((a, b) => {
      if (sort === "price_asc") return a.price - b.price;
      if (sort === "price_desc") return b.price - a.price;
      if (sort === "popular") return (b.sold_count || 0) - (a.sold_count || 0);
      return new Date(b.created_date) - new Date(a.created_date);
    });

  const avgRating = reviews.length > 0 ? (reviews.reduce((s, r) => s + r.rating, 0) / reviews.length).toFixed(1) : null;
  const totalSales = products.reduce((s, p) => s + (p.sold_count || 0), 0);

  if (loading) return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <Loader2 className="w-8 h-8 animate-spin text-primary" />
    </div>
  );

  if (!seller) return (
    <div className="min-h-screen bg-background">
      <Navbar cart={cart} />
      <div className="max-w-4xl mx-auto px-4 py-20 text-center">
        <Store className="w-16 h-16 mx-auto text-gray-200 mb-4" />
        <h1 className="font-poppins font-bold text-2xl mb-2">Store Not Found</h1>
        <p className="text-muted-foreground mb-6">This store doesn't exist or may have been removed.</p>
        <Link to="/products"><Button className="bg-primary hover:bg-primary/90">Browse All Products</Button></Link>
      </div>
      <Footer />
    </div>
  );

  return (
    <div className="min-h-screen bg-background">
      <Navbar cart={cart} wishlistCount={wishlist.length} />

      {/* Store Hero Banner */}
      <div className="bg-gradient-to-br from-primary via-primary/90 to-orange-600 text-white">
        <div className="max-w-7xl mx-auto px-4 py-10">
          <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6">
            {/* Store Logo */}
            <div className="w-24 h-24 bg-white rounded-2xl overflow-hidden flex items-center justify-center flex-shrink-0 shadow-lg">
              {seller.logo ? <img src={seller.logo} alt={seller.store_name} className="w-full h-full object-cover" /> :
                <div className="w-full h-full bg-primary/10 flex items-center justify-center"><Store className="w-10 h-10 text-primary" /></div>}
            </div>
            {/* Store Info */}
            <div className="text-center sm:text-left flex-1">
              <div className="flex items-center gap-2 justify-center sm:justify-start mb-1">
                <h1 className="font-poppins font-black text-2xl sm:text-3xl">{seller.store_name}</h1>
                <div className="bg-white/20 border border-white/30 rounded-full px-2 py-0.5 flex items-center gap-1">
                  <Shield className="w-3 h-3" />
                  <span className="text-xs font-semibold">Verified</span>
                </div>
              </div>
              {seller.store_description && <p className="text-white/80 text-sm max-w-xl mb-3">{seller.store_description}</p>}
              <div className="flex flex-wrap gap-4 justify-center sm:justify-start text-sm">
                <div className="flex items-center gap-1">
                  <Package className="w-4 h-4 text-white/70" />
                  <span><strong>{products.length}</strong> Products</span>
                </div>
                {totalSales > 0 && <div className="flex items-center gap-1"><span>🛒 <strong>{totalSales}</strong> Sold</span></div>}
                {avgRating && (
                  <div className="flex items-center gap-1">
                    <Star className="w-4 h-4 fill-yellow-300 text-yellow-300" />
                    <span><strong>{avgRating}</strong> Rating ({reviews.length} reviews)</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      <main className="max-w-7xl mx-auto px-4 py-6">
        <div className="flex flex-col lg:flex-row gap-6">
          {/* Sidebar */}
          <aside className="lg:w-56 flex-shrink-0 space-y-4">
            {/* Store Contact */}
            <div className="bg-white rounded-xl border border-border p-4 space-y-3">
              <h3 className="font-semibold text-sm">Store Info</h3>
              {seller.address && <div className="flex items-start gap-2 text-sm text-muted-foreground"><MapPin className="w-3.5 h-3.5 mt-0.5 flex-shrink-0 text-primary" /><span>{seller.address}</span></div>}
              {seller.phone && <div className="flex items-center gap-2 text-sm text-muted-foreground"><Phone className="w-3.5 h-3.5 flex-shrink-0 text-primary" /><span>{seller.phone}</span></div>}
              {seller.email && <div className="flex items-center gap-2 text-sm text-muted-foreground"><Mail className="w-3.5 h-3.5 flex-shrink-0 text-primary" /><span className="truncate">{seller.email}</span></div>}
            </div>

            {/* Stats */}
            <div className="bg-white rounded-xl border border-border p-4">
              <h3 className="font-semibold text-sm mb-3">Store Stats</h3>
              <div className="space-y-2">
                <div className="flex justify-between text-sm"><span className="text-muted-foreground">Total Products</span><span className="font-semibold">{products.length}</span></div>
                <div className="flex justify-between text-sm"><span className="text-muted-foreground">Total Sales</span><span className="font-semibold">{totalSales}</span></div>
                {avgRating && <div className="flex justify-between text-sm"><span className="text-muted-foreground">Avg Rating</span><span className="font-semibold text-yellow-600">⭐ {avgRating}</span></div>}
              </div>
            </div>

            {/* Categories */}
            {categories.length > 1 && (
              <div className="bg-white rounded-xl border border-border p-4">
                <h3 className="font-semibold text-sm mb-3">Categories</h3>
                <div className="space-y-1">
                  {categories.map(c => (
                    <button key={c} onClick={() => setActiveCategory(c)}
                      className={`w-full flex items-center justify-between px-2 py-1.5 rounded-lg text-sm transition-colors ${activeCategory === c ? "bg-primary text-white" : "hover:bg-muted text-foreground"}`}>
                      <span className="capitalize">{c === "all" ? "All Products" : c}</span>
                      <span className="text-xs opacity-70">{c === "all" ? products.length : products.filter(p => p.category === c).length}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </aside>

          {/* Product Grid */}
          <div className="flex-1">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
              <p className="text-muted-foreground text-sm">{filtered.length} product{filtered.length !== 1 ? "s" : ""} found</p>
              <select value={sort} onChange={e => setSort(e.target.value)}
                className="border border-border rounded-lg px-3 py-1.5 text-sm bg-white focus:outline-none focus:ring-1 focus:ring-primary">
                <option value="newest">Newest First</option>
                <option value="popular">Most Popular</option>
                <option value="price_asc">Price: Low to High</option>
                <option value="price_desc">Price: High to Low</option>
              </select>
            </div>

            {filtered.length === 0 ? (
              <div className="bg-white rounded-2xl border border-border p-16 text-center">
                <Package className="w-12 h-12 mx-auto text-gray-200 mb-3" />
                <p className="text-muted-foreground font-medium">No products in this category</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {filtered.map(p => (
                  <ProductCard key={p.id} product={p} onAddToCart={handleAddToCart} onAddToWishlist={handleAddToWishlist}
                    isWishlisted={wishlist.some(w => w.product_id === p.id)} />
                ))}
              </div>
            )}

            {/* Reviews Section */}
            {reviews.length > 0 && (
              <div className="mt-8">
                <h2 className="font-poppins font-bold text-lg mb-4">Customer Reviews ({reviews.length})</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {reviews.slice(0, 6).map(r => (
                    <div key={r.id} className="bg-white rounded-xl border border-border p-4">
                      <div className="flex items-center justify-between mb-2">
                        <p className="font-semibold text-sm">{r.customer_name || "Customer"}</p>
                        <div className="flex text-yellow-400">{Array.from({ length: r.rating }).map((_, i) => <Star key={i} className="w-3 h-3 fill-current" />)}</div>
                      </div>
                      {r.title && <p className="text-sm font-medium mb-1">{r.title}</p>}
                      {r.body && <p className="text-sm text-muted-foreground">{r.body}</p>}
                      <p className="text-xs text-muted-foreground mt-2">{r.product_name}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
