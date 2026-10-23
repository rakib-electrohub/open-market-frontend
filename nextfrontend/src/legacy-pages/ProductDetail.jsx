import { useState, useEffect } from "react";
import { useParams, Link, useNavigate } from "@/lib/next-router";
import { apiClient } from "@/api/apiClient";
import { getCartItemKey, persistCart } from "@/utils/cart";
import { useToast } from "@/components/ui/use-toast";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import SEO from "@/components/SEO";
import FlashSaleTimer from "@/components/store/FlashSaleTimer";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Star, ShoppingCart, Heart, Truck, Shield, BadgeCheck, ChevronRight, Minus, Plus, ZoomIn, X, ChevronLeft, AlertTriangle, Video } from "lucide-react";
import ReviewForm from "@/components/store/ReviewForm";
import ProductChatBox from "@/components/store/ProductChatBox";
import FallbackImage from "@/components/ui/FallbackImage";
import RichTextRenderer from "@/components/RichTextRenderer";
import { getProductImageUrls } from "@/utils/imageUrls";
import { getVariantPrice, normalizeProductSpecifications, normalizeProductVariants } from "@/utils/productAttributes";

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

function QuantityStepper({ quantity, onChange, max, compact = false }) {
  const maxQuantity = Number.isFinite(Number(max)) ? Math.max(0, Number(max)) : 1;

  return (
    <div className={`flex shrink-0 items-center overflow-hidden rounded-lg border border-border ${compact ? "h-11" : ""}`}>
      <button
        type="button"
        aria-label="Decrease quantity"
        disabled={quantity <= 1}
        onClick={() => onChange((current) => Math.max(1, current - 1))}
        className={`transition-colors hover:bg-muted disabled:opacity-50 ${compact ? "px-1.5" : "px-3 py-2"}`}
      >
        <Minus className={compact ? "h-3.5 w-3.5" : "h-4 w-4"} />
      </button>
      <span className={`text-center font-semibold ${compact ? "min-w-6 px-1 text-sm" : "min-w-[3rem] px-4 py-2"}`}>
        {quantity}
      </span>
      <button
        type="button"
        aria-label="Increase quantity"
        disabled={quantity >= maxQuantity}
        onClick={() => onChange((current) => Math.min(maxQuantity, current + 1))}
        className={`transition-colors hover:bg-muted disabled:opacity-50 ${compact ? "px-1.5" : "px-3 py-2"}`}
      >
        <Plus className={compact ? "h-3.5 w-3.5" : "h-4 w-4"} />
      </button>
    </div>
  );
}

export default function ProductDetail({ initialData }) {
  const { id } = useParams();
  const hasInitialData = Boolean(initialData);
  const [product, setProduct] = useState(() => initialData?.product || null);
  const [reviews, setReviews] = useState(() => initialData?.reviews || []);
  const [selectedImage, setSelectedImage] = useState(0);
  const [showVideo, setShowVideo] = useState(false);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [activeDetailTab, setActiveDetailTab] = useState("description");
  const [quantity, setQuantity] = useState(1);
  const [variantSelection, setVariantSelection] = useState(() => ({
    productId: initialData?.product?.id,
    values: Object.fromEntries(normalizeProductVariants(initialData?.product?.variants)
      .map((variant) => [variant.name, variant.options[0].value])),
  }));
  const [wishlist, setWishlist] = useState([]);
  const [userEmail, setUserEmail] = useState(null);
  const [cart, setCart] = useState(() => {
    if (typeof window === "undefined") return [];
    try { return JSON.parse(window.localStorage.getItem("cart") || "[]"); } catch { return []; }
  });
  const [loading, setLoading] = useState(!hasInitialData);
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    const loadProduct = async () => {
      try {
        if (!hasInitialData) {
          const prod = await apiClient.entities.Product.get(id).catch(() => null);
          const revs = await apiClient.entities.Review.filter({ product_id: id, is_approved: true }).catch(() => []);
          setProduct(prod);
          setReviews(revs);
        }

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
  }, [hasInitialData, id]);

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
  const isWishlisted = wishlist.some(w => w.product_id === product.id);
  const productImages = getProductImageUrls(product);
  const productVariants = normalizeProductVariants(product.variants);
  const selectedVariants = variantSelection.productId === product.id
    ? variantSelection.values
    : Object.fromEntries(productVariants.map((variant) => [variant.name, variant.options[0].value]));
  const productSpecifications = normalizeProductSpecifications(product.specifications);
  const missingVariant = productVariants.find((variant) => !selectedVariants[variant.name]);
  const basePrice = isFlashSale ? product.flash_sale_price : product.price;
  const originalBasePrice = isFlashSale ? product.price : product.compare_price;
  const price = getVariantPrice(productVariants, selectedVariants, basePrice);
  const originalPrice = originalBasePrice ? getVariantPrice(productVariants, selectedVariants, originalBasePrice) : originalBasePrice;
  const discount = originalPrice ? Math.round(((originalPrice - price) / originalPrice) * 100) : 0;
  const productDescription = product.short_description || product.description || `Buy ${product.name} from Open Market BD.`;
  const avgRating = reviews.length ? reviews.reduce((a, r) => a + r.rating, 0) / reviews.length : 0;
  const detailTabs = [
    { id: "description", label: "Description" },
    { id: "specifications", label: "Specifications" },
    { id: "reviews", label: `Reviews (${reviews.length})` },
    { id: "questions", label: "Q&A (0)" },
  ];
  const handleDetailTabKeyDown = (event, index) => {
    let nextIndex;
    if (event.key === "ArrowRight") nextIndex = (index + 1) % detailTabs.length;
    else if (event.key === "ArrowLeft") nextIndex = (index - 1 + detailTabs.length) % detailTabs.length;
    else if (event.key === "Home") nextIndex = 0;
    else if (event.key === "End") nextIndex = detailTabs.length - 1;
    else return;

    event.preventDefault();
    setActiveDetailTab(detailTabs[nextIndex].id);
    document.getElementById(`product-tab-${detailTabs[nextIndex].id}`)?.focus();
  };
  const handleAddToCart = () => {
    if (missingVariant) {
      toast({ title: `Please select ${missingVariant.name}`, variant: "destructive" });
      return;
    }
    const selected_variants = Object.keys(selectedVariants).length ? selectedVariants : undefined;
    const cartItem = { product_id: product.id, product_name: product.name, product_image: productImages[0], seller_id: product.seller_id, seller_name: product.seller_name, quantity, price, ...(selected_variants ? { selected_variants } : {}) };
    const itemKey = getCartItemKey(cartItem);
    const existing = cart.find(item => getCartItemKey(item) === itemKey);
    const newCart = existing
      ? cart.map(item => getCartItemKey(item) === itemKey ? { ...item, quantity: item.quantity + quantity } : item)
      : [...cart, cartItem];
    setCart(newCart);
    persistCart(newCart);
    toast({ title: "Added to cart!", description: `${quantity}x ${product.name}` });
  };

  const handleBuyNow = () => {
    if (missingVariant) {
      toast({ title: `Please select ${missingVariant.name}`, variant: "destructive" });
      return;
    }
    const item = { product_id: product.id, product_name: product.name, product_image: productImages[0], seller_id: product.seller_id, seller_name: product.seller_name, quantity, price, ...(Object.keys(selectedVariants).length ? { selected_variants: selectedVariants } : {}) };
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

  return (
    <div className="min-h-screen bg-background">
      <SEO
        title={`${product.name} | Open Market BD`}
        description={productDescription.replace(/<[^>]+>/g, " ").trim().slice(0, 160)}
        canonicalPath={`/product/${product.id}`}
      />
      <Navbar cart={cart} wishlistCount={wishlist.length} />
      <main className="max-w-7xl mx-auto px-4 py-6 pb-24 lg:pb-6">
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
              <div className="mb-4 flex flex-wrap items-center gap-x-3 gap-y-2">
                {product.sku && (
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">SKU</span>
                    <span className="rounded-md bg-muted px-2 py-1 text-sm font-mono text-foreground">{product.sku}</span>
                  </div>
                )}
                <div className="flex items-center gap-2">
                  <div className="flex">{[1,2,3,4,5].map(s => <Star key={s} className={`w-4 h-4 ${s <= Math.round(avgRating) ? "text-yellow-400 fill-yellow-400" : "text-gray-200 fill-gray-200"}`} />)}</div>
                  <span className="text-sm font-medium">{avgRating.toFixed(1)}</span>
                  <button type="button" onClick={() => setActiveDetailTab("reviews")} className="text-muted-foreground text-sm hover:text-primary">
                    ({reviews.length} reviews)
                  </button>
                  <span className="text-muted-foreground text-sm">• {product.sold_count || 0} sold</span>
                </div>
              </div>
              {product.short_description && (
                <RichTextRenderer content={product.short_description} className="mb-5 text-sm text-muted-foreground rich-text-content" />
              )}

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
              {productVariants.map(variant => (
                <div key={variant.name} className="mb-4">
                  <p className="text-sm font-semibold mb-2">{variant.name}</p>
                  <div className="flex flex-wrap gap-2">
                    {variant.options?.map((option) => (
                      <button key={option.value} onClick={() => setVariantSelection({
                        productId: product.id,
                        values: { ...selectedVariants, [variant.name]: option.value },
                      })}
                        className={`px-3 py-1.5 text-sm border rounded-lg transition-colors ${selectedVariants[variant.name] === option.value ? "border-primary bg-primary/10 text-primary" : "border-border hover:border-primary/50"}`}>
                        {option.value}{option.price_adjustment ? ` (${option.price_adjustment > 0 ? "+" : "−"}৳${Math.abs(option.price_adjustment).toLocaleString()})` : ""}
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
              <div className="mb-6 hidden items-center gap-4 lg:flex">
                <span className="text-sm font-semibold">Quantity:</span>
                <QuantityStepper quantity={quantity} onChange={setQuantity} max={product.stock} />
                <span className={`text-sm font-medium ${product.stock === 0 ? "text-red-500" : product.stock <= 5 ? "text-orange-500" : "text-green-600"}`}>
                  {product.stock > 0 ? `${product.stock} in stock` : "Out of stock"}
                </span>
              </div>

              {/* Actions */}
              <div className="mb-6 hidden flex-wrap items-center gap-3 lg:flex">
                <Button onClick={handleAddToCart} disabled={product.stock === 0} className="flex-1 bg-red-600 hover:bg-red-700 h-12 text-base font-semibold">
                  <ShoppingCart className="w-5 h-5 mr-2" /> Add to Cart
                </Button>
                <Button onClick={handleBuyNow} disabled={product.stock === 0} className="h-12 px-5 bg-emerald-600 text-white hover:bg-emerald-700">
                  Buy
                </Button>
                <Button variant="outline" onClick={handleWishlist} className={`h-12 w-12 px-0 ${isWishlisted ? "border-primary text-primary" : ""}`}>
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

              {/* Trust */}
              <div className="grid grid-cols-3 gap-3 pt-4 border-t border-border">
                {[{ icon: Truck, label: "Fast Delivery" }, { icon: Shield, label: "Secure Payment" }, { icon: BadgeCheck, label: "Product Tested" }].map(({ icon: Icon, label }) => (
                  <div key={label} className="flex flex-col items-center gap-1 text-center">
                    <Icon className="w-5 h-5 text-primary" />
                    <span className="text-xs text-muted-foreground">{label}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="mt-8 border-t border-border pt-6">
            <div role="tablist" aria-label="Product details" className="mb-6 flex max-w-full gap-1 overflow-x-auto rounded-xl border border-border bg-muted/40 p-1">
              {detailTabs.map((tab, index) => (
                <button
                  key={tab.id}
                  id={`product-tab-${tab.id}`}
                  type="button"
                  role="tab"
                  aria-selected={activeDetailTab === tab.id}
                  aria-controls={`product-panel-${tab.id}`}
                  onClick={() => setActiveDetailTab(tab.id)}
                  onKeyDown={(event) => handleDetailTabKeyDown(event, index)}
                  tabIndex={activeDetailTab === tab.id ? 0 : -1}
                  className={`shrink-0 rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
                    activeDetailTab === tab.id
                      ? "bg-white text-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            <section id="product-panel-description" role="tabpanel" aria-labelledby="product-tab-description" tabIndex={0} hidden={activeDetailTab !== "description"} className="space-y-6">
                {product.description && (
                  <div>
                    <h2 className="mb-3 font-poppins text-lg font-bold">Product Description</h2>
                    <RichTextRenderer content={product.description} className="text-sm text-muted-foreground rich-text-content" />
                  </div>
                )}
                {!product.description && (
                  <p className="text-sm text-muted-foreground">No description has been added for this product.</p>
                )}
            </section>

            <section id="product-panel-specifications" role="tabpanel" aria-labelledby="product-tab-specifications" tabIndex={0} hidden={activeDetailTab !== "specifications"}>
                {productSpecifications.length ? (
                  <div className="overflow-hidden rounded-xl border border-border">
                    {productSpecifications.map((specification, index) => (
                      <div key={`${specification.name}-${index}`} className={`grid grid-cols-1 gap-1 px-4 py-3 sm:grid-cols-[minmax(0,1fr)_minmax(0,2fr)] sm:gap-4 ${index % 2 ? "bg-muted/30" : "bg-white"}`}>
                        <span className="text-sm font-semibold">{specification.name}</span>
                        <span className="text-sm text-muted-foreground">{specification.value}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">No specifications have been added for this product.</p>
                )}
            </section>

            <section id="product-panel-reviews" role="tabpanel" aria-labelledby="product-tab-reviews" tabIndex={0} hidden={activeDetailTab !== "reviews"}>
                <h2 className="mb-5 font-poppins text-lg font-bold">Customer Reviews ({reviews.length})</h2>
                {reviews.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No reviews yet. Be the first to review!</p>
                ) : (
                  <div className="space-y-4">
                    {reviews.map((r) => (
                      <div key={r.id} className="rounded-xl bg-muted/30 p-4">
                        <div className="mb-2 flex items-center gap-2">
                          <div className="flex">{[1, 2, 3, 4, 5].map((s) => <Star key={s} className={`h-3.5 w-3.5 ${s <= r.rating ? "fill-yellow-400 text-yellow-400" : "fill-gray-200 text-gray-200"}`} />)}</div>
                          <span className="text-sm font-semibold">{r.customer_name || "Customer"}</span>
                          <span className="text-xs text-muted-foreground">{new Date(r.created_date).toLocaleDateString()}</span>
                        </div>
                        {r.title && <p className="mb-1 text-sm font-medium">{r.title}</p>}
                        {r.body && <p className="text-sm text-muted-foreground">{r.body}</p>}
                        {r.photo_url && (
                          <img src={r.photo_url} alt="Review photo" className="mt-2 h-32 w-32 cursor-pointer rounded-lg border border-border object-cover hover:opacity-90" onClick={() => window.open(r.photo_url, "_blank")} />
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
            </section>

            <section id="product-panel-questions" role="tabpanel" aria-labelledby="product-tab-questions" tabIndex={0} hidden={activeDetailTab !== "questions"}>
                <h2 className="mb-2 font-poppins text-lg font-bold">Questions & Answers</h2>
                <p className="mb-4 text-sm text-muted-foreground">Ask the seller privately about this product.</p>
                <ProductChatBox product={product} />
            </section>
          </div>
        </div>
      </main>
      <div
        role="region"
        aria-label="Product purchase controls"
        className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-white/95 px-3 pt-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] shadow-[0_-4px_16px_rgba(0,0,0,0.08)] backdrop-blur lg:hidden"
      >
        <div className="mx-auto flex max-w-7xl items-center gap-1.5">
          <QuantityStepper quantity={quantity} onChange={setQuantity} max={product.stock} compact />
          <Button
            onClick={handleAddToCart}
            disabled={product.stock === 0}
            title="Add to Cart"
            className="h-11 min-w-0 flex-1 gap-1 bg-red-600 px-2 text-xs font-semibold hover:bg-red-700 min-[380px]:text-sm"
          >
            <ShoppingCart className="h-4 w-4 shrink-0" />
            <span>Add<span className="hidden min-[380px]:inline"> to Cart</span></span>
          </Button>
          <Button
            onClick={handleBuyNow}
            disabled={product.stock === 0}
            className="h-11 shrink-0 bg-emerald-600 px-2.5 text-xs text-white hover:bg-emerald-700"
          >
            Buy
          </Button>
          <Button
            variant="outline"
            onClick={handleWishlist}
            aria-label={isWishlisted ? "Remove from wishlist" : "Add to wishlist"}
            className={`h-11 w-11 shrink-0 px-0 ${isWishlisted ? "border-primary text-primary" : ""}`}
          >
            <Heart className={`h-5 w-5 ${isWishlisted ? "fill-primary text-primary" : ""}`} />
          </Button>
        </div>
      </div>
      <Footer />
    </div>
  );
}
