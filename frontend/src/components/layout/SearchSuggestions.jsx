import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Search, X, TrendingUp } from "lucide-react";
import { apiClient } from "@/api/apiClient";
import FallbackImage from "@/components/ui/FallbackImage";
import { getProductImageUrls } from "@/utils/imageUrls";
import { useAppSettings } from "@/hooks/useAppSettings";
import { getCategoriesFromSettings } from "@/utils/categories";

export default function SearchSuggestions({ className = "" }) {
  const [query, setQuery] = useState("");
  const [suggestions, setSuggestions] = useState([]);
  const [allProducts, setAllProducts] = useState([]);
  const [open, setOpen] = useState(false);
  const [focused, setFocused] = useState(false);
  const inputRef = useRef(null);
  const containerRef = useRef(null);
  const navigate = useNavigate();
  const settings = useAppSettings();

  useEffect(() => {
    apiClient.entities.Product.filter({ is_active: true, approval_status: "approved" }, "-sold_count", 100)
      .then(p => setAllProducts(p))
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!query.trim()) {
      setSuggestions([]);
      return;
    }
    const q = query.toLowerCase();
    const matched = allProducts.filter(p =>
      p.name?.toLowerCase().includes(q) ||
      p.brand?.toLowerCase().includes(q) ||
      p.category?.toLowerCase().includes(q) ||
      p.tags?.some(t => t.toLowerCase().includes(q))
    ).slice(0, 8);
    setSuggestions(matched);
    setOpen(true);
  }, [query, allProducts]);

  useEffect(() => {
    const handleClick = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setOpen(false);
        setFocused(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const handleSearch = (e) => {
    e.preventDefault();
    if (query.trim()) {
      setOpen(false);
      navigate(`/products?search=${encodeURIComponent(query)}`);
    }
  };

  const selectSuggestion = (product) => {
    setOpen(false);
    setQuery("");
    navigate(`/product/${product.id}`);
  };

  const trendingCategories = getCategoriesFromSettings(settings).slice(0, 6);

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      <form onSubmit={handleSearch}>
        <div className={`flex w-full rounded-full border-2 overflow-hidden transition-colors ${focused ? "border-primary" : "border-primary"}`}>
          <input
            ref={inputRef}
            value={query}
            onChange={e => setQuery(e.target.value)}
            onFocus={() => { setFocused(true); if (query) setOpen(true); else setOpen(true); }}
            placeholder="Search products, brands, categories..."
            className="flex-1 border-0 outline-none px-4 text-sm h-10 bg-white text-foreground placeholder:text-muted-foreground"
          />
          {query && (
            <button type="button" onClick={() => { setQuery(""); setSuggestions([]); setOpen(false); }} className="px-2 text-muted-foreground hover:text-foreground">
              <X className="w-4 h-4" />
            </button>
          )}
          <button type="submit" className="bg-primary px-5 text-white hover:bg-primary/90 transition-colors rounded-r-full">
            <Search className="w-4 h-4" />
          </button>
        </div>
      </form>

      {open && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-border rounded-2xl shadow-xl z-[100] overflow-hidden">
          {suggestions.length > 0 ? (
            <>
              <div className="px-3 py-2 text-xs text-muted-foreground font-medium border-b border-border/50">Products</div>
              {suggestions.map(p => {
                const price = p.flash_sale_price && new Date(p.flash_sale_end) > new Date() ? p.flash_sale_price : p.price;
                return (
                  <button key={p.id} onClick={() => selectSuggestion(p)}
                    className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-muted/50 transition-colors text-left">
                    <div className="w-10 h-10 bg-gray-50 rounded-lg overflow-hidden flex-shrink-0 border border-border">
                      <FallbackImage
                        sources={getProductImageUrls(p)}
                        alt=""
                        className="w-full h-full object-cover"
                        fallback={<Search className="w-4 h-4 m-3 text-gray-300" />}
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">{p.name}</p>
                      <p className="text-xs text-muted-foreground">{p.brand || p.category}</p>
                    </div>
                    <span className="text-sm font-bold text-primary flex-shrink-0">৳{price?.toLocaleString()}</span>
                  </button>
                );
              })}
              <button onClick={handleSearch}
                className="w-full px-3 py-2.5 text-sm text-primary font-medium border-t border-border/50 hover:bg-primary/5 transition-colors text-left">
                See all results for "{query}"
              </button>
            </>
          ) : query ? (
            <div className="px-4 py-6 text-center text-muted-foreground text-sm">No products found for "{query}"</div>
          ) : (
            <div className="p-3">
              <p className="text-xs text-muted-foreground font-medium mb-2 flex items-center gap-1"><TrendingUp className="w-3 h-3" /> Trending Categories</p>
              <div className="flex flex-wrap gap-2">
                {trendingCategories.map(c => (
                  <button key={c} onClick={() => navigate(`/products?main_category=${encodeURIComponent(c)}`)}
                    className="px-3 py-1 bg-muted/60 hover:bg-primary/10 hover:text-primary rounded-full text-xs font-medium transition-colors">
                    {c}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

