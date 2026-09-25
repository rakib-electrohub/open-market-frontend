import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Smartphone, Shirt, Home, Sparkles, Dumbbell, ShoppingBasket, Gamepad2, BookOpen, Car, MoreHorizontal } from "lucide-react";
import { apiClient } from "@/api/apiClient";
import { useAppSettings } from "@/hooks/useAppSettings";
import { getCategoriesFromSettings } from "@/utils/categories";
import { normalizeImageUrl } from "@/utils/imageUrls";

const CATEGORY_STYLES = [
  { icon: Smartphone, color: "bg-blue-50 text-blue-600", border: "hover:border-blue-300" },
  { icon: Shirt, color: "bg-pink-50 text-pink-600", border: "hover:border-pink-300" },
  { icon: Home, color: "bg-orange-50 text-orange-600", border: "hover:border-orange-300" },
  { icon: Sparkles, color: "bg-purple-50 text-purple-600", border: "hover:border-purple-300" },
  { icon: Dumbbell, color: "bg-green-50 text-green-600", border: "hover:border-green-300" },
  { icon: ShoppingBasket, color: "bg-yellow-50 text-yellow-600", border: "hover:border-yellow-300" },
  { icon: Gamepad2, color: "bg-red-50 text-red-600", border: "hover:border-red-300" },
  { icon: BookOpen, color: "bg-teal-50 text-teal-600", border: "hover:border-teal-300" },
  { icon: Car, color: "bg-gray-50 text-gray-600", border: "hover:border-gray-300" },
];

export default function CategoryGrid() {
  const settings = useAppSettings();
  const [categories, setCategories] = useState([]);

  useEffect(() => {
    apiClient.entities.Category.list("-created_date", 100)
      .then((items) => {
        const normalized = (items || [])
          .filter((entry) => entry?.name && !entry?.parent_id)
          .map((entry, index) => ({
            id: entry.id,
            name: entry.name,
            image: entry.image,
            slug: entry.slug,
            ...CATEGORY_STYLES[index % CATEGORY_STYLES.length],
          }));
        if (normalized.length) setCategories(normalized);
      })
      .catch(() => {});
  }, []);

  const visibleCategories = categories.length ? categories.slice(0, 8) : getCategoriesFromSettings(settings).slice(0, 8).map((name, index) => ({
    name,
    ...CATEGORY_STYLES[index % CATEGORY_STYLES.length],
  }));

  const moreCard = { name: "More Categories", icon: MoreHorizontal, color: "bg-primary/10 text-primary", border: "hover:border-primary/30" };

  return (
    <section>
      <div className="flex items-center justify-between mb-5">
        <h2 className="font-poppins font-bold text-xl text-foreground">Shop by Category</h2>
        <Link to="/products" className="text-primary text-sm font-medium hover:underline">View All →</Link>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
        {visibleCategories.map(({ name, icon: Icon, color, border, image }) => (
          <Link key={name} to={`/products?main_category=${encodeURIComponent(name)}`}
            className={`flex flex-col items-center gap-2 p-3 bg-white rounded-xl border border-border ${border} transition-all duration-200 hover:shadow-md hover:-translate-y-0.5 group`}>
            {image ? (
              <div className="w-14 h-14 rounded-xl overflow-hidden border border-border/60 bg-muted/30">
                <img src={normalizeImageUrl(image)} alt={name} className="w-full h-full object-cover" />
              </div>
            ) : (
              <div className={`w-10 h-10 rounded-xl ${color} flex items-center justify-center group-hover:scale-110 transition-transform`}>
                <Icon className="w-5 h-5" />
              </div>
            )}
            <span className="text-[10px] sm:text-xs font-medium text-foreground text-center leading-tight">{name}</span>
          </Link>
        ))}
        <Link to="/products" className={`flex flex-col items-center gap-2 p-3 bg-white rounded-xl border border-border ${moreCard.border} transition-all duration-200 hover:shadow-md hover:-translate-y-0.5 group`}>
          <div className={`w-10 h-10 rounded-xl ${moreCard.color} flex items-center justify-center group-hover:scale-110 transition-transform`}>
            <MoreHorizontal className="w-5 h-5" />
          </div>
          <span className="text-[10px] sm:text-xs font-medium text-foreground text-center leading-tight">More Categories</span>
        </Link>
      </div>
    </section>
  );
}
