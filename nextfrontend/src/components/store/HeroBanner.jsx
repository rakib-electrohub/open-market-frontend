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
          <div className="absolute inset-0 bg-gradient-to-r from-black/60 via-black/30 to-transparent" />
          <div className="absolute inset-0 flex items-center">
            <div className="max-w-7xl mx-auto px-8 w-full">
              <div className="max-w-md">
                <h2 className="font-poppins font-black text-3xl sm:text-4xl lg:text-5xl text-white leading-tight mb-3 drop-shadow-lg">
                  {banner.title}
                </h2>
                <p className="text-white/90 text-sm sm:text-base mb-6 font-medium drop-shadow">
                  {banner.subtitle}
                </p>
                <Link to={banner.link || "/products"}
                  className="inline-flex items-center gap-2 bg-primary hover:bg-primary/90 text-white font-semibold px-6 py-3 rounded-full transition-all duration-200 hover:shadow-lg hover:scale-105 text-sm sm:text-base">
                  {banner.button_text || "Shop Now"} →
                </Link>
              </div>
            </div>
          </div>
        </div>
      ))}

      {/* Controls */}
      <button onClick={prev} className="absolute left-3 top-1/2 -translate-y-1/2 w-10 h-10 bg-white/20 backdrop-blur hover:bg-white/40 rounded-full flex items-center justify-center text-white transition-all">
        <ChevronLeft className="w-5 h-5" />
      </button>
      <button onClick={next} className="absolute right-3 top-1/2 -translate-y-1/2 w-10 h-10 bg-white/20 backdrop-blur hover:bg-white/40 rounded-full flex items-center justify-center text-white transition-all">
        <ChevronRight className="w-5 h-5" />
      </button>

      {/* Dots */}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2">
        {items.map((_, i) => (
          <button key={i} onClick={() => setCurrent(i)}
            className={`w-2 h-2 rounded-full transition-all ${i === current ? "w-6 bg-white" : "bg-white/50"}`} />
        ))}
      </div>
    </div>
  );
}
