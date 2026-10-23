import { useState } from "react";
import { Link, useNavigate } from "@/lib/next-router";
import { Heart, ShoppingCart, Star, Zap, AlertTriangle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import FallbackImage from "@/components/ui/FallbackImage";
import { getProductImageUrls } from "@/utils/imageUrls";

export default function ProductCard({ product, onAddToCart, onAddToWishlist, isWishlisted }) {
  const [hovered, setHovered] = useState(false);
  const navigate = useNavigate();
  const hasVariants = Array.isArray(product.variants) && product.variants.some((variant) => (
    variant?.name && Array.isArray(variant.options) && variant.options.length
  ));

  const isFlashSale = product.flash_sale_price && product.flash_sale_end && new Date(product.flash_sale_end) > new Date();
  const displayPrice = isFlashSale ? product.flash_sale_price : product.price;
  const originalPrice = isFlashSale ? product.price : product.compare_price;
  const discount = originalPrice ? Math.round(((originalPrice - displayPrice) / originalPrice) * 100) : 0;
  const productImages = getProductImageUrls(product);
  const imageFallback = (
    <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-gray-100 to-gray-200">
      <ShoppingCart className="w-12 h-12 text-gray-300" />
    </div>
  );

  return (
    <div
      className="bg-white rounded-xl overflow-hidden border border-border hover:shadow-lg transition-all duration-300 group relative"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* Badges */}
      <div className="absolute top-2 left-2 z-10 flex flex-col gap-1">
        {isFlashSale && (
          <Badge className="bg-primary text-white text-[10px] px-1.5 py-0.5 flex items-center gap-0.5 font-semibold">
            <Zap className="w-2.5 h-2.5" /> FLASH
          </Badge>
        )}
        {discount > 0 && (
          <Badge className="bg-green-500 text-white text-[10px] px-1.5 py-0.5 font-bold">
            -{discount}% OFF
          </Badge>
        )}
        {product.is_featured && !isFlashSale && (
          <Badge className="bg-blue-500 text-white text-[10px] px-1.5 py-0.5">Featured</Badge>
        )}
        {product.stock > 0 && product.stock <= 5 && (
          <Badge className="bg-orange-500 text-white text-[10px] px-1.5 py-0.5 flex items-center gap-0.5">
            <AlertTriangle className="w-2.5 h-2.5" /> Only {product.stock} left
          </Badge>
        )}
        {product.stock === 0 && (
          <Badge className="bg-gray-500 text-white text-[10px] px-1.5 py-0.5">Out of Stock</Badge>
        )}
      </div>

      {/* Wishlist button */}
      <button
        onClick={(e) => { 
          e.preventDefault(); 
          e.stopPropagation();
          onAddToWishlist?.(product); 
        }}
        className={`absolute top-2 right-2 z-10 w-8 h-8 rounded-full flex items-center justify-center border shadow-sm transition-all duration-200 ${
          isWishlisted
            ? "border-primary bg-primary text-white"
            : "border-gray-200 bg-white text-gray-500 hover:border-primary hover:bg-primary hover:text-white"
        }`}
        title={isWishlisted ? "Remove from wishlist" : "Add to wishlist"}
        aria-label={isWishlisted ? "Remove from wishlist" : "Add to wishlist"}
      >
        <Heart className={`w-4 h-4 ${isWishlisted ? "fill-current" : ""}`} />
      </button>

      {/* Image */}
      <Link to={`/product/${product.id}`}>
        <div className="relative aspect-square overflow-hidden bg-gray-50">
          <FallbackImage
            sources={productImages}
            alt={product.name}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
            fallback={imageFallback}
          />
        </div>
      </Link>

      {/* Info */}
      <div className="p-3">
        <Link to={`/product/${product.id}`}>
          <p className="text-xs text-muted-foreground mb-0.5 truncate">{product.brand || product.category}</p>
          <h3 className="font-medium text-sm text-foreground line-clamp-2 leading-tight mb-1 group-hover:text-primary transition-colors">
            {product.name}
          </h3>
          {product.sku && (
            <p className="text-[10px] text-muted-foreground font-mono mb-2 truncate">SKU: {product.sku}</p>
          )}
        </Link>

        {/* Sold count */}
        {product.sold_count > 0 && (
          <p className="text-xs text-muted-foreground mb-1">{product.sold_count.toLocaleString()} sold</p>
        )}

        {/* Rating */}
        {product.average_rating > 0 && (
          <div className="flex items-center gap-1 mb-2">
            <div className="flex">
              {[1,2,3,4,5].map((s) => (
                <Star key={s} className={`w-3 h-3 ${s <= Math.round(product.average_rating) ? "text-yellow-400 fill-yellow-400" : "text-gray-200 fill-gray-200"}`} />
              ))}
            </div>
            <span className="text-xs text-muted-foreground">({product.review_count || 0})</span>
          </div>
        )}

        {/* Price */}
        <div className="mb-3">
          <div className="flex items-center gap-2">
            <span className="font-bold text-base text-foreground font-poppins">৳{displayPrice?.toLocaleString()}</span>
            {originalPrice > displayPrice && (
              <span className="text-xs text-muted-foreground line-through">৳{originalPrice?.toLocaleString()}</span>
            )}
          </div>
          {originalPrice > displayPrice && (
            <p className="text-[10px] text-green-600 font-semibold mt-0.5">
              You save ৳{(originalPrice - displayPrice).toLocaleString()}
            </p>
          )}
        </div>

        <Button
          onClick={() => hasVariants ? navigate(`/product/${product.id}`) : onAddToCart?.(product)}
          disabled={product.stock === 0}
          size="sm"
          className="w-full bg-red-600 hover:bg-red-700 text-white text-xs h-8 disabled:opacity-60"
        >
          <ShoppingCart className="w-3 h-3 mr-1" />
          {product.stock === 0 ? "Out of Stock" : hasVariants ? "Choose Options" : "Add to Cart"}
        </Button>
      </div>
    </div>
  );
}
