import { Link } from "@/lib/next-router";
import { Zap } from "lucide-react";
import ProductCard from "./ProductCard";
import FlashSaleTimer from "./FlashSaleTimer";

export default function FlashSaleSection({ products = [], onAddToCart, onAddToWishlist, wishlist = [] }) {
  const flashProducts = products.filter(p => p.flash_sale_price && p.flash_sale_end && new Date(p.flash_sale_end) > new Date());
  if (!flashProducts.length) return null;

  // Use the earliest ending flash sale time
  const endTime = flashProducts.reduce((earliest, p) => {
    const t = new Date(p.flash_sale_end);
    return t < earliest ? t : earliest;
  }, new Date(flashProducts[0].flash_sale_end));

  return (
    <section>
      <div className="bg-gradient-to-r from-primary to-orange-500 rounded-2xl overflow-hidden">
        <div className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
              <Zap className="w-5 h-5 text-white fill-white" />
            </div>
            <div>
              <h2 className="font-poppins font-black text-xl text-white">Flash Sale</h2>
              <p className="text-white/80 text-xs">Limited time — grab it before it's gone!</p>
            </div>
          </div>
          <FlashSaleTimer endTime={endTime.toISOString()} />
          <Link to="/products?flash=true" className="text-white/90 hover:text-white text-sm font-semibold border border-white/40 px-4 py-1.5 rounded-full hover:bg-white/20 transition-all">
            View All →
          </Link>
        </div>

        <div className="bg-white/5 px-4 pb-4">
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
            {flashProducts.slice(0, 5).map((p) => (
              <div key={p.id} className="bg-white rounded-xl overflow-hidden">
                <ProductCard
                  product={p}
                  onAddToCart={onAddToCart}
                  onAddToWishlist={onAddToWishlist}
                  isWishlisted={wishlist.some(w => w.product_id === p.id)}
                />
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}