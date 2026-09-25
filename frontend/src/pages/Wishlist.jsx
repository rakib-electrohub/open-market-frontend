import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { apiClient } from "@/api/apiClient";
import { useToast } from "@/components/ui/use-toast";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import { Button } from "@/components/ui/button";
import { Heart, ShoppingCart, Trash2, Loader2 } from "lucide-react";

export default function Wishlist() {
  const [wishlist, setWishlist] = useState([]);
  const [loading, setLoading] = useState(true);
  const [cart, setCart] = useState(() => { try { return JSON.parse(localStorage.getItem("cart") || "[]"); } catch { return []; } });
  const { toast } = useToast();

  useEffect(() => {
    apiClient.auth.me()
      .then(u => apiClient.entities.Wishlist.filter({ created_by: u.email }))
      .catch(() => [])
      .then(items => { setWishlist(items || []); setLoading(false); });
  }, []);

  const removeFromWishlist = async (item) => {
    await apiClient.entities.Wishlist.delete(item.id);
    setWishlist(wishlist.filter(w => w.id !== item.id));
    toast({ title: "Removed from wishlist" });
  };

  const addToCart = (item) => {
    const existing = cart.find(c => c.product_id === item.product_id);
    const newCart = existing ? cart.map(c => c.product_id === item.product_id ? { ...c, quantity: c.quantity + 1 } : c)
      : [...cart, { product_id: item.product_id, product_name: item.product_name, product_image: item.product_image, quantity: 1, price: item.product_price }];
    setCart(newCart);
    localStorage.setItem("cart", JSON.stringify(newCart));
    toast({ title: "Added to cart!", description: item.product_name });
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar cart={cart} wishlistCount={wishlist.length} />
      <main className="max-w-4xl mx-auto px-4 py-6">
        <h1 className="font-poppins font-bold text-2xl mb-6 flex items-center gap-2">
          <Heart className="w-6 h-6 text-primary fill-primary" /> Wishlist ({wishlist.length})
        </h1>

        {loading ? (
          <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>
        ) : wishlist.length === 0 ? (
          <div className="text-center py-20">
            <Heart className="w-16 h-16 mx-auto text-gray-200 mb-4" />
            <h2 className="font-poppins font-bold text-xl mb-2">Your wishlist is empty</h2>
            <p className="text-muted-foreground mb-6">Save items you love to your wishlist</p>
            <Link to="/products"><Button className="bg-primary hover:bg-primary/90">Explore Products</Button></Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {wishlist.map(item => (
              <div key={item.id} className="bg-white rounded-xl border border-border p-4 flex gap-4">
                <Link to={`/product/${item.product_id}`} className="w-20 h-20 bg-gray-50 rounded-lg overflow-hidden flex-shrink-0">
                  {item.product_image ? <img src={item.product_image} alt={item.product_name} className="w-full h-full object-cover" /> : <Heart className="w-8 h-8 text-gray-200 m-6" />}
                </Link>
                <div className="flex-1 min-w-0">
                  <Link to={`/product/${item.product_id}`}><h3 className="font-medium text-sm line-clamp-2 hover:text-primary transition-colors">{item.product_name}</h3></Link>
                  <p className="font-poppins font-bold mt-1 text-primary">৳{item.product_price?.toLocaleString()}</p>
                  <div className="flex gap-2 mt-2">
                    <Button size="sm" onClick={() => addToCart(item)} className="bg-primary hover:bg-primary/90 h-7 text-xs px-3">
                      <ShoppingCart className="w-3 h-3 mr-1" /> Add to Cart
                    </Button>
                    <button onClick={() => removeFromWishlist(item)} className="p-1.5 text-muted-foreground hover:text-destructive transition-colors">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
      <Footer />
    </div>
  );
}
