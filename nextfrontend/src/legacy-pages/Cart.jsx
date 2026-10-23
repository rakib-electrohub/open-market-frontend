import { useState, useEffect } from "react";
import { Link, useNavigate } from "@/lib/next-router";
import { apiClient } from "@/api/apiClient";
import { getCartItemKey, persistCart } from "@/utils/cart";
import { useToast } from "@/components/ui/use-toast";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Trash2, Minus, Plus, ShoppingCart, Tag, ChevronRight } from "lucide-react";

export default function Cart() {
  const [cart, setCart] = useState(() => { try { return JSON.parse(localStorage.getItem("cart") || "[]"); } catch { return []; } });
  const [couponCode, setCouponCode] = useState("");
  const [appliedCoupon, setAppliedCoupon] = useState(null);
  const [couponError, setCouponError] = useState("");
  const [applyingCoupon, setApplyingCoupon] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();

  const saveCart = (newCart) => {
    setCart(newCart);
    persistCart(newCart);
  };

  const updateQty = (item, qty) => {
    if (qty <= 0) return removeItem(item);
    const itemKey = getCartItemKey(item);
    saveCart(cart.map(cartItem => getCartItemKey(cartItem) === itemKey ? { ...cartItem, quantity: qty } : cartItem));
  };

  const removeItem = (item) => {
    const itemKey = getCartItemKey(item);
    saveCart(cart.filter(cartItem => getCartItemKey(cartItem) !== itemKey));
    toast({ title: "Item removed" });
  };

  const subtotal = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const shippingFee = subtotal >= 999 ? 0 : 60;

  let discount = 0;
  if (appliedCoupon) {
    discount = appliedCoupon.type === "percentage"
      ? Math.min((subtotal * appliedCoupon.value) / 100, appliedCoupon.max_discount || Infinity)
      : appliedCoupon.value;
  }
  const total = Math.max(0, subtotal - discount + shippingFee);

  const handleApplyCoupon = async () => {
    if (!couponCode.trim()) return;
    setApplyingCoupon(true);
    setCouponError("");
    const coupons = await apiClient.entities.Coupon.filter({ code: couponCode.toUpperCase(), is_active: true });
    const coupon = coupons[0];
    if (!coupon) { setCouponError("Invalid coupon code"); setApplyingCoupon(false); return; }
    if (coupon.expiry_date && new Date(coupon.expiry_date) < new Date()) { setCouponError("This coupon has expired"); setApplyingCoupon(false); return; }
    if (coupon.max_uses && coupon.used_count >= coupon.max_uses) { setCouponError("Coupon usage limit reached"); setApplyingCoupon(false); return; }
    if (coupon.min_order_value && subtotal < coupon.min_order_value) { setCouponError(`Minimum order ৳${coupon.min_order_value} required`); setApplyingCoupon(false); return; }
    setAppliedCoupon(coupon);
    setApplyingCoupon(false);
    toast({ title: "Coupon applied!", description: `${coupon.type === "percentage" ? coupon.value + "%" : "৳" + coupon.value} discount` });
  };

  if (cart.length === 0) return (
    <div className="min-h-screen bg-background">
      <Navbar cart={[]} />
      <main className="max-w-7xl mx-auto px-4 py-20 text-center">
        <ShoppingCart className="w-20 h-20 mx-auto text-gray-200 mb-4" />
        <h2 className="font-poppins font-bold text-2xl mb-2">Your cart is empty</h2>
        <p className="text-muted-foreground mb-6">Add some products to get started!</p>
        <Link to="/products"><Button className="bg-primary hover:bg-primary/90">Start Shopping</Button></Link>
      </main>
      <Footer />
    </div>
  );

  return (
    <div className="min-h-screen bg-background">
      <Navbar cart={cart} />
      <main className="max-w-7xl mx-auto px-4 py-6">
        <h1 className="font-poppins font-bold text-2xl mb-6">Shopping Cart ({cart.length} items)</h1>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Items */}
          <div className="lg:col-span-2 space-y-3">
            {cart.map(item => (
              <div key={getCartItemKey(item)} className="bg-white rounded-xl border border-border p-4 flex gap-4">
                <Link to={`/product/${item.product_id}`}>
                  <div className="w-20 h-20 bg-gray-50 rounded-lg overflow-hidden flex-shrink-0">
                    {item.product_image ? <img src={item.product_image} alt={item.product_name} className="w-full h-full object-cover" /> : <ShoppingCart className="w-8 h-8 text-gray-300 m-auto mt-6" />}
                  </div>
                </Link>
                <div className="flex-1 min-w-0">
                  <Link to={`/product/${item.product_id}`}><h3 className="font-medium text-sm line-clamp-2 hover:text-primary transition-colors">{item.product_name}</h3></Link>
                  {Object.entries(item.selected_variants || {}).map(([name, option]) => (
                    <p key={name} className="text-xs text-muted-foreground">{name}: {option}</p>
                  ))}
                  <p className="font-poppins font-bold text-base mt-1">৳{(item.price * item.quantity).toLocaleString()}</p>
                  <p className="text-xs text-muted-foreground">৳{item.price.toLocaleString()} each</p>
                </div>
                <div className="flex flex-col items-end justify-between">
                  <button onClick={() => removeItem(item)} className="text-muted-foreground hover:text-destructive transition-colors">
                    <Trash2 className="w-4 h-4" />
                  </button>
                  <div className="flex items-center border border-border rounded-lg overflow-hidden">
                    <button onClick={() => updateQty(item, item.quantity - 1)} className="px-2 py-1 hover:bg-muted"><Minus className="w-3 h-3" /></button>
                    <span className="px-3 text-sm font-semibold">{item.quantity}</span>
                    <button onClick={() => updateQty(item, item.quantity + 1)} className="px-2 py-1 hover:bg-muted"><Plus className="w-3 h-3" /></button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Summary */}
          <div className="space-y-4">
            {/* Coupon */}
            <div className="bg-white rounded-xl border border-border p-4">
              <h3 className="font-semibold mb-3 flex items-center gap-2"><Tag className="w-4 h-4 text-primary" /> Apply Coupon</h3>
              {appliedCoupon ? (
                <div className="flex items-center gap-2 bg-green-50 border border-green-200 rounded-lg p-2">
                  <Badge className="bg-green-500 text-white">{appliedCoupon.code}</Badge>
                  <span className="text-sm text-green-700 flex-1">-{appliedCoupon.type === "percentage" ? appliedCoupon.value + "%" : "৳" + appliedCoupon.value}</span>
                  <button onClick={() => { setAppliedCoupon(null); setCouponCode(""); }} className="text-gray-400 hover:text-red-500"><Trash2 className="w-4 h-4" /></button>
                </div>
              ) : (
                <div className="flex gap-2">
                  <Input value={couponCode} onChange={e => setCouponCode(e.target.value.toUpperCase())} placeholder="COUPON CODE" className="text-sm uppercase" onKeyDown={e => e.key === "Enter" && handleApplyCoupon()} />
                  <Button size="sm" onClick={handleApplyCoupon} disabled={applyingCoupon} className="bg-primary hover:bg-primary/90">Apply</Button>
                </div>
              )}
              {couponError && <p className="text-destructive text-xs mt-2">{couponError}</p>}
            </div>

            {/* Order Summary */}
            <div className="bg-white rounded-xl border border-border p-4">
              <h3 className="font-semibold mb-4">Order Summary</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between"><span className="text-muted-foreground">Subtotal</span><span>৳{subtotal.toLocaleString()}</span></div>
                {discount > 0 && <div className="flex justify-between text-green-600"><span>Discount</span><span>-৳{discount.toLocaleString()}</span></div>}
                <div className="flex justify-between"><span className="text-muted-foreground">Shipping</span><span>{shippingFee === 0 ? <span className="text-green-600">FREE</span> : `৳${shippingFee}`}</span></div>
                <div className="flex justify-between font-bold text-base pt-2 border-t border-border"><span>Total</span><span className="text-primary font-poppins">৳{total.toLocaleString()}</span></div>
              </div>
              <Button onClick={() => navigate("/checkout", { state: { cart, total, discount, shippingFee, coupon: appliedCoupon } })}
                className="w-full mt-4 bg-primary hover:bg-primary/90 h-11 font-semibold">
                Proceed to Checkout <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
              <Link to="/products" className="block text-center text-sm text-primary mt-2 hover:underline">Continue Shopping</Link>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
