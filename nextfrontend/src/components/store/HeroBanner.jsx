import { useState, useEffect } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Link } from "@/lib/next-router";
import FallbackImage from "@/components/ui/FallbackImage";
import { normalizeImageUrl } from "@/utils/imageUrls";
import { useAppSettings } from "@/hooks/useAppSettings";
import { getCategoriesFromSettings } from "@/utils/categories";

const getDefaultBanners = (categories) => [
  {
    id: 1,
    title: "Summer Mega Sale",
    subtitle: "Up to 70% off on selected items",
    button_text: "Shop Now",
    link: "/products",
    gradient: "from-red-600 via-orange-500 to-yellow-400",
    image: "https://images.unsplash.com/photo-1607082348824-0a96f2a4b9da?w=1200&q=80"
  },
  {
    id: 2,
    title: categories[0] ? `New ${categories[0]} Arrivals` : "New Arrivals",
    subtitle: "Latest products at unbeatable prices",
    button_text: "Explore Now",
    link: categories[0] ? `/products?category=${encodeURIComponent(categories[0])}` : "/products",
    gradient: "from-blue-700 via-blue-500 to-cyan-400",
    image: "https://images.unsplash.com/photo-1498049794561-7780e7231661?w=1200&q=80"
  },
  {
    id: 3,
    title: categories[1] ? `${categories[1]} Deals` : "Featured Deals",
    subtitle: "Popular picks from top brands",
    button_text: categories[1] ? `Shop ${categories[1]}` : "Shop Deals",
    link: categories[1] ? `/products?category=${encodeURIComponent(categories[1])}` : "/products",
    gradient: "from-purple-700 via-pink-500 to-rose-400",
    image: "https://images.unsplash.com/photo-1490481651871-ab68de25d43d?w=1200&q=80"
  }
];

export default function HeroBanner({ banners }) {
  const settings = useAppSettings();
  const categories = getCategoriesFromSettings(settings);
  const items = (banners && banners.length > 0) ? banners : getDefaultBanners(categories);
  const [current, setCurrent] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => setCurrent((c) => (c + 1) % items.length), 5000);
    return () => clearInterval(timer);
  }, [items.length]);

  const prev = () => setCurrent((c) => (c - 1 + items.length) % items.length);
  const next = () => setCurrent((c) => (c + 1) % items.length);

  return (
    <div className="relative overflow-hidden rounded-2xl h-[280px] sm:h-[380px] lg:h-[460px]">
      {items.map((banner, i) => (
        <div
          key={banner.id || i}
          className={`absolute inset-0 transition-opacity duration-700 ${i === current ? "opacity-100" : "opacity-0 pointer-events-none"}`}
        >
          <FallbackImage
            src={normalizeImageUrl(banner.image)}
            alt={banner.title}
            className="w-full h-full object-cover"
            fallback={<div className={`w-full h-full bg-gradient-to-r ${banner.gradient || "from-red-600 via-orange-500 to-yellow-400"}`} />}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/55 via-black/10 to-transparent" />
          <div className="marketplace-hero-glow" />
          <div className="absolute inset-0 flex items-end pb-10 sm:pb-12">
            <div className="mx-auto flex w-full max-w-7xl items-end justify-between gap-4 px-5 sm:gap-8 sm:px-8">
              <div className="max-w-[65%] sm:max-w-md">
                <h2 className="mb-2 font-poppins text-2xl font-black leading-tight text-white sm:mb-3 sm:text-4xl lg:text-5xl">
                  {banner.title}
                </h2>
                <p className="mb-0 text-xs font-medium text-white/90 sm:text-base">
                  {banner.subtitle}
                </p>
              </div>
              <div className="shrink-0">
                <Link to={banner.link || "/products"}
                  className="inline-flex items-center gap-1.5 rounded-full bg-primary px-4 py-2.5 text-xs font-semibold text-white transition-colors duration-200 hover:bg-primary/90 sm:gap-2 sm:px-6 sm:py-3 sm:text-base">
                  {banner.button_text || "Shop Now"} <span aria-hidden="true">→</span>
                </Link>
              </div>
            </div>
          </div>
        </div>
      ))}

      <div className="absolute bottom-2 left-1/2 z-10 flex -translate-x-1/2 items-center gap-2 rounded-full bg-black/20 px-2 py-1">
        <button
          type="button"
          onClick={prev}
          aria-label="Previous banner"
          className="flex h-7 w-7 items-center justify-center rounded-full text-white/90 transition-colors hover:bg-white/20 hover:text-white"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
        <div className="flex items-center gap-2" aria-label={`Banner ${current + 1} of ${items.length}`}>
          {items.map((_, i) => (
            <button
              key={i}
              type="button"
              onClick={() => setCurrent(i)}
              aria-label={`Show banner ${i + 1}`}
              aria-current={i === current ? "true" : undefined}
              className={`h-2 rounded-full transition-all ${i === current ? "w-6 bg-white" : "w-2 bg-white/50 hover:bg-white/75"}`}
            />
          ))}
        </div>
        <button
          type="button"
          onClick={next}
          aria-label="Next banner"
          className="flex h-7 w-7 items-center justify-center rounded-full text-white/90 transition-colors hover:bg-white/20 hover:text-white"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
