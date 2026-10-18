import { useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, Zap } from "lucide-react";
import { Link } from "@/lib/next-router";
import ProductCard from "./ProductCard";
import FlashSaleTimer from "./FlashSaleTimer";

export default function FlashSaleSection({
  products = [],
  hasMoreProducts = false,
  loadingMoreProducts = false,
  onLoadMoreProducts,
  onAddToCart,
  onAddToWishlist,
  wishlist = [],
}) {
  const trackRef = useRef(null);
  const advanceAfterLoadRef = useRef(false);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);
  const flashProducts = products.filter(
    (product) =>
      product.flash_sale_price &&
      product.flash_sale_end &&
      new Date(product.flash_sale_end) > new Date()
  );

  useEffect(() => {
    const track = trackRef.current;
    if (!track) return undefined;

    const updateScrollButtons = () => {
      setCanScrollLeft(track.scrollLeft > 1);
      setCanScrollRight(track.scrollLeft + track.clientWidth < track.scrollWidth - 1);
    };

    updateScrollButtons();
    track.addEventListener("scroll", updateScrollButtons, { passive: true });
    const resizeObserver = new ResizeObserver(updateScrollButtons);
    resizeObserver.observe(track);

    return () => {
      track.removeEventListener("scroll", updateScrollButtons);
      resizeObserver.disconnect();
    };
  }, [flashProducts.length]);

  useEffect(() => {
    if (advanceAfterLoadRef.current && !loadingMoreProducts) {
      advanceAfterLoadRef.current = false;
      trackRef.current?.scrollBy({ left: trackRef.current.clientWidth * 0.85, behavior: "smooth" });
    }
  }, [flashProducts.length, loadingMoreProducts]);

  if (!flashProducts.length) return null;

  const endTime = flashProducts.reduce((earliest, product) => {
    const time = new Date(product.flash_sale_end);
    return time < earliest ? time : earliest;
  }, new Date(flashProducts[0].flash_sale_end));

  const scrollTrack = (direction) => {
    const track = trackRef.current;
    if (track) track.scrollBy({ left: direction * track.clientWidth * 0.85, behavior: "smooth" });
  };

  const handleNext = () => {
    if (canScrollRight) {
      scrollTrack(1);
      return;
    }
    if (hasMoreProducts && !loadingMoreProducts && onLoadMoreProducts) {
      advanceAfterLoadRef.current = true;
      onLoadMoreProducts();
    }
  };

  return (
    <section>
      <div className="overflow-hidden rounded-2xl bg-gradient-to-r from-primary to-orange-500">
        <div className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/20">
              <Zap className="h-5 w-5 fill-white text-white" />
            </div>
            <div>
              <h2 className="font-poppins text-xl font-black text-white">Flash Sale</h2>
              <p className="text-xs text-white/80">Limited time — grab it before it&apos;s gone!</p>
            </div>
          </div>
          <FlashSaleTimer endTime={endTime.toISOString()} />
          <Link to="/products?flash=true" className="rounded-full border border-white/40 px-4 py-1.5 text-sm font-semibold text-white/90 transition-all hover:bg-white/20 hover:text-white">
            View All →
          </Link>
        </div>

        <div className="relative bg-white/5 px-4 pb-4">
          <div
            ref={trackRef}
            className="flex snap-x snap-mandatory gap-3 overflow-x-auto scroll-smooth [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
            aria-label="Flash sale products"
          >
            {flashProducts.map((product) => (
              <div key={product.id} className="w-[calc(50%_-_0.375rem)] shrink-0 snap-start overflow-hidden rounded-xl bg-white sm:w-[calc(33.333%_-_0.5rem)] md:w-[calc(25%_-_0.5625rem)] lg:w-[calc(20%_-_0.6rem)]">
                <ProductCard
                  product={product}
                  onAddToCart={onAddToCart}
                  onAddToWishlist={onAddToWishlist}
                  isWishlisted={wishlist.some((item) => item.product_id === product.id)}
                />
              </div>
            ))}
          </div>

          {canScrollLeft && (
            <button
              type="button"
              onClick={() => scrollTrack(-1)}
              aria-label="Show previous flash sale products"
              className="absolute left-2 top-1/2 z-10 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-white/20 text-white shadow transition hover:bg-white/40"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
          )}
          {(canScrollRight || hasMoreProducts) && (
            <button
              type="button"
              onClick={handleNext}
              disabled={loadingMoreProducts}
              aria-label={loadingMoreProducts ? "Loading more flash sale products" : "Show more flash sale products"}
              className="absolute right-2 top-1/2 z-10 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-white/20 text-white shadow transition hover:bg-white/40 disabled:cursor-wait disabled:opacity-60"
            >
              <ChevronRight className="h-5 w-5" />
            </button>
          )}
        </div>
      </div>
    </section>
  );
}
