import { useState, useEffect } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { apiClient } from "@/api/apiClient";
import { useToast } from "@/components/ui/use-toast";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import SEO from "@/components/SEO";
import FlashSaleTimer from "@/components/store/FlashSaleTimer";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Star, ShoppingCart, Heart, Truck, Shield, RefreshCcw, ChevronRight, Minus, Plus, ZoomIn, X, ChevronLeft, AlertTriangle, Video } from "lucide-react";
import ReviewForm from "@/components/store/ReviewForm";
import ProductChatBox from "@/components/store/ProductChatBox";
import FallbackImage from "@/components/ui/FallbackImage";
import RichTextRenderer from "@/components/RichTextRenderer";
import { getProductImageUrls } from "@/utils/imageUrls";

function VideoPlayer({ url }) {
  const isYouTube = url.includes('youtube.com') || url.includes('youtu.be');
  if (isYouTube) {
    const match = url.match(/(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
    if (match) {
      const videoId = match[1];
      const embedUrl = `https://www.youtube-nocookie.com/embed/${videoId}?rel=0&modestbranding=1`;
      return (
        <div className="relative w-full h-full bg-black flex flex-col">
          <iframe
            src={embedUrl}
            className="w-full flex-1"
            frameBorder="0"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            referrerPolicy="strict-origin-when-cross-origin"
            allowFullScreen
            title="Product video"
          />
          <a
            href={`https://www.youtube.com/watch?v=${videoId}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 bg-red-600 hover:bg-red-700 text-white text-xs py-2 transition-colors flex-shrink-0"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor"><path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-2.75 12.65 12.65 0 0 0-4-.63 12.65 12.65 0 0 0-4 .63 4.83 4.83 0 0 1-3.77 2.75A4.78 4.78 0 0 0 2 11.31v1.38a4.78 4.78 0 0 0 2.05 4.62 4.83 4.83 0 0 1 3.77 2.75 12.65 12.65 0 0 0 4 .63 12.65 12.65 0 0 0 4-.63 4.83 4.83 0 0 1 3.77-2.75A4.78 4.78 0 0 0 22 12.69v-1.38a4.78 4.78 0 0 0-2.41-4.62zM10 15V9l5 3z"/></svg>
            Can't play? Watch on YouTube
          </a>
        </div>
      );
    }
  }
  return <video src={url} controls className="w-full h-full object-contain bg-black" />;
}

export default function ProductDetail() {
  const { id } = useParams();
  const [product, setProduct] = useState(null);
  const [reviews, setReviews] = useState([]);
  const [selectedImage, setSelectedImage] = useState(0);
  const [showVideo, setShowVideo] = useState(false);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [quantity, setQuantity] = useState(1);
  const [selectedVariants, setSelectedVariants] = useState({});
  const [wishlist, setWishlist] = useState([]);
  const [userEmail, setUserEmail] = useState(null);
  const [cart, setCart] = useState(() => { try { return JSON.parse(localStorage.getItem("cart") || "[]"); } catch { return []; } });
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    const loadProduct = async () => {
      try {
        const prod = await apiClient.entities.Product.get(id).catch(() => null);

        const revs = await apiClient.entities.Review.filter({
          product_id: id,
          is_approved: true
        }).catch(() => []);

        setProduct(prod);
        setReviews(revs);

        try {
          const user = await apiClient.auth.me();

          setUserEmail(user.email);

          const wish = await apiClient.entities.Wishlist.filter({
            created_by: user.email
          }).catch(() => []);

          setWishlist(wish);
        } catch {
          setWishlist([]);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    loadProduct();
  }, [id]);

  // Sync real review data back to product entity so product cards show accurate info
  useEffect(() => {
    if (!product || loading || reviews.length === 0) return;
    const realAvg = Math.round((reviews.reduce((a, r) => a + r.rating, 0) / reviews.length) * 10) / 10;
    const realCount = reviews.length;
    if (product.review_count !== realCount || Math.abs((product.average_rating || 0) - realAvg) > 0.05) {
      apiClient.entities.Product.update(product.id, { average_rating: realAvg, review_count: realCount }).catch(() => {});
    }
  }, [reviews, product, loading]);

  if (loading) return <div className="min-h-screen flex items-center justify-center"><div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" /></div>;
  if (!product) return <div className="min-h-screen flex items-center justify-center"><p>Product not found</p></div>;

  const isFlashSale = product.flash_sale_price && product.flash_sale_end && new Date(product.flash_sale_end) > new Date();
  const price = isFlashSale ? product.flash_sale_price : product.price;
  const originalPrice = isFlashSale ? product.price : product.compare_price;
  const discount = originalPrice ? Math.round(((originalPrice - price) / originalPrice) * 100) : 0;
  const isWishlisted = wishlist.some(w => w.product_id === product.id);
  const productImages = getProductImageUrls(product);
  const productDescription = product.short_description || product.description || `Buy ${product.name} from Open Market BD.`;
  const productStructuredData = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.name,
    description: productDescription.replace(/<[^>]+>/g, " ").trim(),
    image: productImages,
    sku: product.sku || product.id,
    offers: {
      "@type": "Offer",
      url: `${window.location.origin}/product/${product.id}`,
      priceCurrency: "BDT",
      price: String(price),
      availability: product.stock > 0 ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
    },
  };

  const handleAddToCart = () => {
    const existing = cart.find(c => c.product_id === product.id);
    const newCart = existing
      ? cart.map(c => c.product_id === product.id ? { ...c, quantity: c.quantity + quantity } : c)
      : [...cart, { product_id: product.id, product_name: product.name, product_image: productImages[0], quantity, price }];
    setCart(newCart);
    localStorage.setItem("cart", JSON.stringify(newCart));
    toast({ title: "Added to cart!", description: `${quantity}x ${product.name}` });
  };

  const handleBuyNow = () => {
    const item = { product_id: product.id, product_name: product.name, product_image: productImages[0], quantity, price };
    navigate("/checkout", { state: { directBuy: item, discount: 0, coupon: null } });
  };

  const handleWishlist = async () => {
    try {
      const inWishlist = wishlist.find(w => w.product_id === product.id);
      if (inWishlist) {
        await apiClient.entities.Wishlist.delete(inWishlist.id);
        setWishlist(wishlist.filter(w => w.product_id !== product.id));
        toast({ title: "Removed from wishlist", variant: "default" });
      } else {
        if (!userEmail) {
          toast({ title: "Please login to add to wishlist", variant: "destructive" });
          return;
        }
        const item = await apiClient.entities.Wishlist.create({ 
          product_id: product.id, 
          product_name: product.name, 
          product_image: productImages[0], 
          product_price: product.price,
          created_by: userEmail
        });
        setWishlist([...wishlist, item]);
        toast({ title: "Added to wishlist", variant: "default" });
      }
    } catch (err) {
      toast({ title: "Error updating wishlist", description: err.message || "Something went wrong", variant: "destructive" });
    }
  };

  const avgRating = reviews.length ? reviews.reduce((a, r) => a + r.rating, 0) / reviews.length : 0;

  return (
    <div className="min-h-screen bg-background">
      <SEO
        title={`${product.name} | Open Market BD`}
        description={productDescription.replace(/<[^>]+>/g, " ").trim().slice(0, 160)}
        canonicalPath={`/product/${product.id}`}
        structuredData={productStructuredData}
      />
      <Navbar cart={cart} wishlistCount={wishlist.length} />
      <main className="max-w-7xl mx-auto px-4 py-6">
        {/* Breadcrumb */}
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-6">
          <Link to="/" className="hover:text-primary">Home</Link>
          <ChevronRight className="w-3 h-3" />
          <Link to="/products" className="hover:text-primary">Products</Link>
          <ChevronRight className="w-3 h-3" />
          <span className="text-foreground line-clamp-1">{product.name}</span>
        </div>

        <div className="bg-white rounded-2xl border border-border p-4 sm:p-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Images Gallery */}
            <div>
              {/* Main display */}
              <div className={`relative aspect-square rounded-xl overflow-hidden bg-gray-50 mb-3 ${!showVideo ? "group cursor-zoom-in" : ""}`}
                onClick={() => !showVideo && productImages[selectedImage] && setLightboxOpen(true)}>
                {showVideo && product.video_url ? (
                  <VideoPlayer url={product.video_url} />
                ) : productImages[selectedImage] ? (
                  <>
                    <FallbackImage sources={productImages.slice(selectedImage).concat(productImages.slice(0, selectedImage))} alt={product.name} className="w-full h-full object-contain transition-transform duration-300 group-hover:scale-105" />
                    <div className="absolute top-3 right-3 bg-black/40 rounded-lg p-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                      <ZoomIn className="w-4 h-4 text-white" />
                    </div>
                  </>
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <ShoppingCart className="w-20 h-20 text-gray-200" />
                  </div>
                )}
                {!showVideo && productImages.length > 1 && (
                  <>
                    <button onClick={(e) => { e.stopPropagation(); setSelectedImage(i => (i - 1 + productImages.length) % productImages.length); }}
                      className="absolute left-2 top-1/2 -translate-y-1/2 bg-white/80 hover:bg-white rounded-full p-1.5 shadow opacity-0 group-hover:opacity-100 transition-opacity">
                      <ChevronLeft className="w-4 h-4 text-gray-700" />
                    </button>
                    <button onClick={(e) => { e.stopPropagation(); setSelectedImage(i => (i + 1) % productImages.length); }}
                      className="absolute right-2 top-1/2 -translate-y-1/2 bg-white/80 hover:bg-white rounded-full p-1.5 shadow opacity-0 group-hover:opacity-100 transition-opacity">
                      <ChevronRight className="w-4 h-4 text-gray-700" />
                    </button>
                    <div className="absolute bottom-3 right-3 bg-black/50 text-white text-xs px-2 py-0.5 rounded-full">
                      {selectedImage + 1}/{productImages.length}
                    </div>
                  </>
                )}
              </div>
              {/* Thumbnails */}
              {(productImages.length > 1 || (productImages.length >= 1 && product.video_url) || product.video_url) && (
                <div className="flex gap-2 overflow-x-auto pb-1">
                  {productImages.map((img, i) => (
                    <button key={i} onClick={() => { setSelectedImage(i); setShowVideo(false); }}
                      className={`w-16 h-16 rounded-lg overflow-hidden flex-shrink-0 border-2 transition-all ${!showVideo && i === selectedImage ? "border-primary scale-105 shadow-md" : "border-border hover:border-primary/50 opacity-70 hover:opacity-100"}`}>
                      <FallbackImage src={img} alt="" className="w-full h-full object-cover" />
                    </button>
                  ))}
                  {product.video_url && (
                    <button onClick={() => setShowVideo(true)}
                      className={`w-16 h-16 rounded-lg flex-shrink-0 border-2 transition-all flex flex-col items-center justify-center bg-gray-900 gap-1 ${showVideo ? "border-primary scale-105 shadow-md" : "border-border hover:border-primary/50 opacity-70 hover:opacity-100"}`}>
                      <Video className="w-6 h-6 text-white" />
                      <span className="text-[9px] text-white/70 font-medium">VIDEO</span>
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* Lightbox */}
            {lightboxOpen && (
              <div className="fixed inset-0 z-50 bg-black/95 flex items-center justify-center" onClick={() => setLightboxOpen(false)}>
                <button className="absolute top-4 right-4 text-white bg-white/10 hover:bg-white/20 rounded-full p-2 transition-colors">
                  <X className="w-6 h-6" />
                </button>
                {productImages.length > 1 && (
                  <>
                    <button onClick={(e) => { e.stopPropagation(); setSelectedImage(i => (i - 1 + productImages.length) % productImages.length); }}
                      className="absolute left-4 top-1/2 -translate-y-1/2 text-white bg-white/10 hover:bg-white/20 rounded-full p-3 transition-colors">
                      <ChevronLeft className="w-6 h-6" />
                    </button>
                    <button onClick={(e) => { e.stopPropagation(); setSelectedImage(i => (i + 1) % productImages.length); }}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-white bg-white/10 hover:bg-white/20 rounded-full p-3 transition-colors">
                      <ChevronRight className="w-6 h-6" />
                    </button>
                  </>
                )}
                <FallbackImage src={productImages[selectedImage]} alt={product.name} className="max-w-[90vw] max-h-[90vh] object-contain" onClick={(e) => e.stopPropagation()} />
                {productImages.length > 1 && (
                  <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex gap-1.5">
                    {productImages.map((_, i) => (
                      <button key={i} onClick={(e) => { e.stopPropagation(); setSelectedImage(i); }}
                        className={`w-2 h-2 rounded-full transition-all ${i === selectedImage ? "bg-white scale-125" : "bg-white/40"}`} />
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Info */}
            <div>
              {product.brand && <p className="text-sm text-muted-foreground mb-1">{product.brand}</p>}
              <h1 className="font-poppins font-bold text-2xl text-foreground mb-3 leading-tight">{product.name}</h1>
              {product.sku && (
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">SKU</span>
                  <span className="text-sm font-mono bg-muted px-2 py-1 rounded-md text-foreground">{product.sku}</span>
                </div>
              )}

              {/* Rating */}
              <div className="flex items-center gap-2 mb-4">
                <div className="flex">{[1,2,3,4,5].map(s => <Star key={s} className={`w-4 h-4 ${s <= Math.round(avgRating) ? "text-yellow-400 fill-yellow-400" : "text-gray-200 fill-gray-200"}`} />)}</div>
                <span className="text-sm font-medium">{avgRating.toFixed(1)}</span>
                <span className="text-muted-foreground text-sm">({reviews.length} reviews)</span>
                <span className="text-muted-foreground text-sm">• {product.sold_count || 0} sold</span>
              </div>

              {/* Flash sale */}
              {isFlashSale && (
                <div className="bg-gradient-to-r from-primary to-orange-500 rounded-xl p-3 mb-4">
                  <FlashSaleTimer endTime={product.flash_sale_end} label="Deal ends in" />
                </div>
              )}

              {/* Price */}
              <div className="mb-5">
                <div className="flex items-center gap-3">
                  <span className="font-poppins font-black text-3xl text-foreground">৳{price?.toLocaleString()}</span>
                  {originalPrice > price && <>
                    <span className="text-xl text-muted-foreground line-through">৳{originalPrice?.toLocaleString()}</span>
                    <Badge className="bg-green-500 text-white text-sm font-bold">-{discount}%</Badge>
                  </>}
                </div>
                {originalPrice > price && (
                  <p className="text-sm text-green-600 font-semibold mt-1">
                    🎉 You save ৳{(originalPrice - price).toLocaleString()} on this product!
                  </p>
                )}
              </div>

              {/* Variants */}
              {product.variants?.map(variant => (
                <div key={variant.name} className="mb-4">
                  <p className="text-sm font-semibold mb-2">{variant.name}</p>
                  <div className="flex flex-wrap gap-2">
                    {variant.options?.map(opt => (
                      <button key={opt} onClick={() => setSelectedVariants({ ...selectedVariants, [variant.name]: opt })}
                        className={`px-3 py-1.5 text-sm border rounded-lg transition-colors ${selectedVariants[variant.name] === opt ? "border-primary bg-primary/10 text-primary" : "border-border hover:border-primary/50"}`}>
                        {opt}
                      </button>
                    ))}
                  </div>
                </div>
              ))}

              {/* Stock status */}
              {product.stock === 0 && (
                <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2 mb-4">
                  <AlertTriangle className="w-4 h-4" /> This product is currently out of stock
                </div>
              )}
              {product.stock > 0 && product.stock <= 5 && (
                <div className="flex items-center gap-2 text-sm text-orange-600 bg-orange-50 border border-orange-200 rounded-lg px-3 py-2 mb-4">
                  <AlertTriangle className="w-4 h-4" /> Only <strong>{product.stock} left</strong> — order soon!
                </div>
              )}

              {/* Quantity */}
              <div className="flex items-center gap-4 mb-6">
                <span className="text-sm font-semibold">Quantity:</span>
                <div className="flex items-center border border-border rounded-lg overflow-hidden">
                  <button onClick={() => setQuantity(q => Math.max(1, q - 1))} className="px-3 py-2 hover:bg-muted transition-colors"><Minus className="w-4 h-4" /></button>
                  <span className="px-4 py-2 font-semibold min-w-[3rem] text-center">{quantity}</span>
                  <button onClick={() => setQuantity(q => Math.max(1, Math.min(product.stock, q + 1)))} className="px-3 py-2 hover:bg-muted transition-colors"><Plus className="w-4 h-4" /></button>
                </div>
                <span className={`text-sm font-medium ${product.stock === 0 ? "text-red-500" : product.stock <= 5 ? "text-orange-500" : "text-green-600"}`}>
                  {product.stock > 0 ? `${product.stock} in stock` : "Out of stock"}
                </span>
              </div>

              {/* Actions */}
              <div className="flex gap-3 mb-6 flex-wrap items-center">
                <Button onClick={handleAddToCart} disabled={product.stock === 0} className="flex-1 bg-primary hover:bg-primary/90 h-12 text-base font-semibold">
                  <ShoppingCart className="w-5 h-5 mr-2" /> Add to Cart
                </Button>
                <Button variant="secondary" onClick={handleBuyNow} disabled={product.stock === 0} size="sm" className="h-10 px-4">
                  Buy
                </Button>
                <Button variant="outline" onClick={handleWishlist} className={`h-12 px-4 ${isWishlisted ? "border-primary text-primary" : ""}`}>
                  <Heart className={`w-5 h-5 ${isWishlisted ? "fill-primary text-primary" : ""}`} />
                </Button>
              </div>

              {/* Seller Info */}
              {product.seller_id && (
                <div className="mb-4 p-3 bg-muted/30 rounded-xl border border-border flex items-center justify-between">
                  <div>
                    <p className="text-xs text-muted-foreground">Sold by</p>
                    <p className="font-semibold text-sm">{product.seller_name || "Store"}</p>
                  </div>
                  <Link to={`/store/${product.seller_id}`} className="text-xs font-semibold text-primary hover:underline flex items-center gap-1">
                    Visit Store →
                  </Link>
                </div>
              )}

              {/* Product Type Badge */}
              {product.product_type && product.product_type !== "physical" && (
                <div className="mb-4 flex items-center gap-2">
                  <span className={`px-3 py-1 rounded-full text-xs font-bold capitalize border ${
                    product.product_type === "digital" ? "bg-blue-50 text-blue-600 border-blue-200" :
                    product.product_type === "service" ? "bg-green-50 text-green-600 border-green-200" :
                    product.product_type === "software" ? "bg-purple-50 text-purple-600 border-purple-200" :
                    "bg-orange-50 text-orange-600 border-orange-200"
                  }`}>
                    {product.product_type === "digital" ? "📥 Digital Download" :
                     product.product_type === "service" ? "🛠 Service" :
                     product.product_type === "software" ? "💻 Software" :
                     product.product_type === "subscription" ? "🔄 Subscription" :
                     product.product_type}
                  </span>
                  {product.delivery_info && <p className="text-xs text-muted-foreground">{product.delivery_info}</p>}
                </div>
              )}

              {/* Chat with Seller */}
              <div className="mb-4">
                <ProductChatBox product={product} />
              </div>

              {/* Trust */}
              <div className="grid grid-cols-3 gap-3 pt-4 border-t border-border">
                {[{ icon: Truck, label: "Fast Delivery" }, { icon: Shield, label: "Secure Payment" }, { icon: RefreshCcw, label: "Easy Returns" }].map(({ icon: Icon, label }) => (
                  <div key={label} className="flex flex-col items-center gap-1 text-center">
                    <Icon className="w-5 h-5 text-primary" />
                    <span className="text-xs text-muted-foreground">{label}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Short Description */}
          {product.short_description && (
            <div className="mt-6 pt-5 border-t border-border">
              <RichTextRenderer content={product.short_description} className="text-foreground text-sm leading-relaxed" />
            </div>
          )}

          {/* Description */}
          {product.description && (
            <div className="mt-6 pt-5 border-t border-border">
              <h2 className="font-poppins font-bold text-lg mb-3">Product Description</h2>
              <RichTextRenderer content={product.description} className="text-sm text-muted-foreground rich-text-content" />
            </div>
          )}

          {/* Reviews */}
          <div className="mt-8 pt-6 border-t border-border">
            <h2 className="font-poppins font-bold text-lg mb-5">Customer Reviews ({reviews.length})</h2>
            {reviews.length === 0 ? (
              <p className="text-muted-foreground text-sm">No reviews yet. Be the first to review!</p>
            ) : (
              <div className="space-y-4">
                {reviews.map(r => (
                  <div key={r.id} className="bg-muted/30 rounded-xl p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="flex">{[1,2,3,4,5].map(s => <Star key={s} className={`w-3.5 h-3.5 ${s <= r.rating ? "text-yellow-400 fill-yellow-400" : "text-gray-200 fill-gray-200"}`} />)}</div>
                      <span className="font-semibold text-sm">{r.customer_name || "Customer"}</span>
                      <span className="text-xs text-muted-foreground">{new Date(r.created_date).toLocaleDateString()}</span>
                    </div>
                    {r.title && <p className="font-medium text-sm mb-1">{r.title}</p>}
                    {r.body && <p className="text-sm text-muted-foreground">{r.body}</p>}
                    {r.photo_url && (
                      <img src={r.photo_url} alt="Review photo" className="mt-2 w-32 h-32 object-cover rounded-lg border border-border cursor-pointer hover:opacity-90" onClick={() => window.open(r.photo_url, '_blank')} />
                    )}
                  </div>
                ))}
              </div>
            )}
            <ReviewForm
              productId={id}
              productName={product.name}
              onReviewSubmitted={() =>
                apiClient.entities.Review.filter({ product_id: id, is_approved: true }).then(setReviews)
              }
            />
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
