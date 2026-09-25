import { Link } from "react-router-dom";
import ProductCard from "./ProductCard";
import { ChevronRight } from "lucide-react";

export default function ProductSection({ title, products = [], viewAllLink, onAddToCart, onAddToWishlist, wishlist = [], badge }) {
  if (!products.length) return null;
  return (
    <section>
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-3">
          <h2 className="font-poppins font-bold text-xl text-foreground">{title}</h2>
          {badge && <span className="bg-primary text-white text-[10px] font-bold px-2 py-0.5 rounded-full uppercase">{badge}</span>}
        </div>
        {viewAllLink && (
          <Link to={viewAllLink} className="flex items-center gap-1 text-primary text-sm font-medium hover:underline">
            View All <ChevronRight className="w-4 h-4" />
          </Link>
        )}
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 sm:gap-4">
        {products.map((p) => (
          <ProductCard
            key={p.id}
            product={p}
            onAddToCart={onAddToCart}
            onAddToWishlist={onAddToWishlist}
            isWishlisted={wishlist.some(w => w.product_id === p.id)}
          />
        ))}
      </div>
    </section>
  );
}