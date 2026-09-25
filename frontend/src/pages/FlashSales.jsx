import { useState, useEffect } from "react";
import { apiClient } from "@/api/apiClient";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import ProductCard from "@/components/store/ProductCard";
import FlashSaleTimer from "@/components/store/FlashSaleTimer";
import { Zap, Loader2 } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";

export default function FlashSales() {
  const [products, setProducts] = useState([]);
  const [cart, setCart] = useState(() => { try { return JSON.parse(localStorage.getItem("cart") || "[]"); } catch { return []; } });
  const [wishlist, setWishlist] = useState([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    const loadData = async () => {
      try {
        const products = await apiClient.entities.Product.list("-created_date", 200);
        const now = new Date();
        setProducts(products.filter(p => p.flash_sale_price && p.flash_sale_end && new Date(p.flash_sale_end) > now && p.approval_status === "approved" && p.is_active));
        
        // Load wishlist for authenticated users
        try {
          const { items: wishlistIds } = await apiClient.wishlist.get();
          setWishlist(wishlistIds || []);
        } catch {
          setWishlist([]);
        }
      } catch (error) {
        console.error('Failed to load flash sales:', error);
      }
      setLoading(false);
    };
    
    loadData();
  }, []);

  const handleAddToCart = (product) => {
    const isFlash = product.flash_sale_price && product.flash_sale_end && new Date(product.flash_sale_end) > new Date();
    const price = isFlash ? product.flash_sale_price : product.price;
    const existing = cart.find(c => c.product_id === product.id);
    const newCart = existing
      ? cart.map(c => c.product_id === product.id ? { ...c, quantity: c.quantity + 1 } : c)
      : [...cart, { product_id: product.id, product_name: product.name, product_image: product.images?.[0], quantity: 1, price }];
    setCart(newCart);
    localStorage.setItem("cart", JSON.stringify(newCart));
    toast({ title: "Added to cart!", description: product.name });
  };

  const handleWishlist = async (product) => {
    try {
      const isWishlisted = wishlist.includes(product.id);
      if (isWishlisted) {
        await apiClient.wishlist.remove(product.id);
        setWishlist(wishlist.filter(id => id !== product.id));
        toast({ title: "Removed from wishlist" });
      } else {
        await apiClient.wishlist.add(product.id);
        setWishlist([...wishlist, product.id]);
        toast({ title: "Added to wishlist!" });
      }
    } catch (error) {
      console.error('Wishlist operation failed:', error);
      toast({ title: "Please log in to use wishlist", variant: "destructive" });
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar cart={cart} wishlistCount={wishlist.length} />
      <main className="max-w-7xl mx-auto px-4 py-8">
        <div className="flex items-center gap-3 mb-8">
          <div className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center">
            <Zap className="w-5 h-5 text-white fill-white" />
          </div>
          <div>
            <h1 className="font-poppins font-bold text-2xl">Flash Sales</h1>
            <p className="text-muted-foreground text-sm">Limited-time deals — grab them before they expire!</p>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-24"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>
        ) : products.length === 0 ? (
          <div className="bg-white rounded-2xl border border-border p-16 text-center">
            <Zap className="w-14 h-14 text-gray-200 mx-auto mb-4" />
            <p className="font-semibold text-lg mb-2">No active flash sales right now</p>
            <p className="text-muted-foreground text-sm">Check back soon for amazing deals!</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
            {products.map(product => (
              <ProductCard
                key={product.id}
                product={product}
                onAddToCart={handleAddToCart}
                onAddToWishlist={handleWishlist}
                isWishlisted={wishlist.includes(product.id)}
              />
            ))}
          </div>
        )}
      </main>
      <Footer />
    </div>
  );
}

