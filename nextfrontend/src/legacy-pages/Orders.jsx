import { useState, useEffect } from "react";
import { Link } from "@/lib/next-router";
import { apiClient } from "@/api/apiClient";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Package, Search, ChevronRight, Loader2 } from "lucide-react";

const STATUS_COLORS = {
  pending: "bg-yellow-100 text-yellow-700",
  processing: "bg-blue-100 text-blue-700",
  shipped: "bg-purple-100 text-purple-700",
  delivered: "bg-green-100 text-green-700",
  cancelled: "bg-red-100 text-red-700",
  refunded: "bg-gray-100 text-gray-700",
};

const STATUS_STEPS = ["pending", "processing", "shipped", "delivered"];

const OrderTracker = ({ status }) => {
  const currentStep = STATUS_STEPS.indexOf(status);
  return (
    <div className="flex items-center gap-1 mt-4">
      {STATUS_STEPS.map((step, i) => (
        <div key={step} className="flex items-center flex-1">
          <div className="w-full flex flex-col items-center gap-1">
            <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold border-2 transition-colors ${i <= currentStep ? "bg-primary border-primary text-white" : "border-border bg-white text-muted-foreground"}`}>
              {i < currentStep ? "✓" : i + 1}
            </div>
            <span className={`text-[10px] capitalize font-medium ${i <= currentStep ? "text-primary" : "text-muted-foreground"}`}>{step}</span>
          </div>
          {i < STATUS_STEPS.length - 1 && (
            <div className={`h-0.5 flex-1 -mt-4 ${i < currentStep ? "bg-primary" : "bg-border"}`} />
          )}
        </div>
      ))}
    </div>
  );
};

const OrderCard = ({ order }) => {
  const [expanded, setExpanded] = useState(false);
  return (
    <div className="bg-white rounded-2xl border border-border overflow-hidden">
      <div className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border/50">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="font-poppins font-bold text-base">{order.order_number}</span>
            <span className={`text-xs font-semibold px-2 py-0.5 rounded-full capitalize ${STATUS_COLORS[order.status] || "bg-gray-100 text-gray-700"}`}>{order.status}</span>
          </div>
          <p className="text-xs text-muted-foreground">{new Date(order.created_date).toLocaleDateString("en-BD", { year: "numeric", month: "long", day: "numeric" })}</p>
        </div>
        <div className="text-right">
          <p className="font-poppins font-bold text-lg text-primary">৳{order.total?.toLocaleString()}</p>
          <p className="text-xs text-muted-foreground uppercase">{order.payment_method}</p>
        </div>
      </div>
      <div className="p-4">
        <div className="flex gap-2 mb-3 overflow-x-auto">
          {order.items?.slice(0, 4).map((item, i) => (
            <div key={i} className="flex-shrink-0 w-12 h-12 bg-gray-50 rounded-lg overflow-hidden border border-border">
              {item.product_image ? <img src={item.product_image} alt={item.product_name} className="w-full h-full object-cover" /> : <Package className="w-6 h-6 m-3 text-gray-300" />}
            </div>
          ))}
          {order.items?.length > 4 && <div className="w-12 h-12 bg-gray-50 rounded-lg border border-border flex items-center justify-center text-xs text-muted-foreground">+{order.items.length - 4}</div>}
        </div>
        {!["cancelled", "refunded"].includes(order.status) && <OrderTracker status={order.status} />}
        <button onClick={() => setExpanded(!expanded)}
          className="mt-3 text-primary text-sm font-medium flex items-center gap-1 hover:underline">
          {expanded ? "Hide details" : "View details"} <ChevronRight className="w-3 h-3" />
        </button>
        {expanded && (
          <div className="mt-4 pt-4 border-t border-border space-y-2">
            <h3 className="font-semibold text-sm mb-2">Order Items</h3>
            {order.items?.map((item, i) => (
              <div key={i} className="flex items-center gap-3 text-sm">
                {item.product_image && <img src={item.product_image} alt="" className="w-10 h-10 object-cover rounded" />}
                <div className="flex-1"><p className="font-medium">{item.product_name}</p><p className="text-muted-foreground text-xs">Qty: {item.quantity}</p></div>
                <span className="font-semibold">৳{(item.price * item.quantity).toLocaleString()}</span>
              </div>
            ))}
            <div className="pt-2 border-t border-border text-sm space-y-1">
              <div className="flex justify-between"><span className="text-muted-foreground">Fulfillment</span><span className="text-right capitalize">{order.fulfillment_method === "pickup" ? "Store pickup" : "Delivery"}</span></div>
              {order.fulfillment_method === "pickup" ? (
                order.pickup_locations?.map((location) => (
                  <div key={location.id} className="flex justify-between gap-4">
                    <span className="text-muted-foreground">{location.store_name}</span>
                    <span className="text-right">{location.address}</span>
                  </div>
                ))
              ) : (
                <div className="flex justify-between"><span className="text-muted-foreground">Delivery address</span><span className="text-right">{order.delivery_address?.street}, {order.delivery_address?.district}</span></div>
              )}
              <div className="flex justify-between"><span className="text-muted-foreground">Payment Method</span><span className="capitalize">{order.payment_method}</span></div>
              {order.transaction_id && (
                <div className="flex justify-between"><span className="text-muted-foreground">Transaction ID</span><span className="font-mono text-xs bg-gray-100 px-2 py-1 rounded">{order.transaction_id}</span></div>
              )}
              <div className="flex justify-between"><span className="text-muted-foreground">Customer</span><span>{order.customer_name} • {order.customer_phone}</span></div>
              {order.payment_method !== "cod" && order.status !== "pending" && (
                <div className="mt-2 p-2 bg-green-50 border border-green-200 rounded text-xs text-green-700">
                  ✓ Payment verified and confirmed
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default function Orders() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  const [guestOrderId, setGuestOrderId] = useState("");
  const [guestPhone, setGuestPhone] = useState("");
  const [guestOrder, setGuestOrder] = useState(null);
  const [guestError, setGuestError] = useState("");
  const [guestSearching, setGuestSearching] = useState(false);

  useEffect(() => {
    apiClient.auth.me()
      .then(async user => {
        setIsLoggedIn(true);
        const emailOrders = await apiClient.entities.Order.filter({ customer_email: user.email }, "-created_date", 50);
        return emailOrders.sort((a, b) => new Date(b.created_date) - new Date(a.created_date));
      })
      .catch(() => {
        setIsLoggedIn(false);
        return [];
      })
      .then(o => { setOrders(o); setLoading(false); });
  }, []);

  const handleGuestTrack = async () => {
    if (!guestOrderId.trim()) { setGuestError("Please enter an order number"); return; }
    if (!guestPhone.trim()) { setGuestError("Please enter the phone number used for this order"); return; }
    setGuestSearching(true);
    setGuestError("");
    setGuestOrder(null);
    const response = await fetch("/api/guest-order/track", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({
        order_number: guestOrderId.trim().toUpperCase(),
        phone: guestPhone.trim(),
      }),
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      setGuestError(data.message || "Order not found. Check your order number and phone.");
      setGuestSearching(false);
      return;
    }
    setGuestOrder(data);
    setGuestSearching(false);
  };

  const filtered = orders.filter(o =>
    o.order_number?.toLowerCase().includes(search.toLowerCase()) ||
    o.status?.includes(search.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-background">
      <Navbar cart={[]} />
      <main className="max-w-4xl mx-auto px-4 py-6">
        <h1 className="font-poppins font-bold text-2xl mb-6">My Orders</h1>

        {loading ? (
          <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>
        ) : isLoggedIn && orders.length > 0 ? (
          <>
            <div className="relative mb-5">
              <Search className="absolute left-3 top-2.5 w-4 h-4 text-muted-foreground" />
              <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by order number or status..." className="pl-9" />
            </div>
            <div className="space-y-4">
              {filtered.map(order => <OrderCard key={order.id} order={order} />)}
              {filtered.length === 0 && <p className="text-center text-muted-foreground py-10">No orders match your search.</p>}
            </div>
          </>
        ) : (
          <>
            {isLoggedIn && orders.length === 0 && (
              <div className="text-center py-10 mb-8">
                <Package className="w-16 h-16 mx-auto text-gray-200 mb-4" />
                <h2 className="font-poppins font-bold text-xl mb-2">No orders found</h2>
                <p className="text-muted-foreground mb-6">Orders placed with your email will appear here</p>
                <Link to="/products" className="bg-primary text-white px-6 py-2.5 rounded-full font-semibold hover:bg-primary/90 transition-colors">Shop Now</Link>
              </div>
            )}

            <div className="bg-white rounded-2xl border border-border p-6 max-w-md mx-auto">
              <h2 className="font-poppins font-bold text-lg mb-1">Track Your Order</h2>
              <p className="text-muted-foreground text-sm mb-4">Enter your order number to track your order status</p>
              <div className="space-y-3">
                <div>
                  <label className="text-sm font-medium mb-1 block">Order Number *</label>
                  <Input value={guestOrderId} onChange={e => setGuestOrderId(e.target.value.toUpperCase())}
                    placeholder="e.g. OMB-12345678" onKeyDown={e => e.key === "Enter" && handleGuestTrack()} />
                </div>
                <div>
                  <label className="text-sm font-medium mb-1 block">Phone Number *</label>
                  <Input value={guestPhone} onChange={e => setGuestPhone(e.target.value)}
                    placeholder="01XXXXXXXXX" onKeyDown={e => e.key === "Enter" && handleGuestTrack()} />
                </div>
                {guestError && <p className="text-destructive text-sm">{guestError}</p>}
                <Button onClick={handleGuestTrack} disabled={guestSearching} className="w-full bg-primary hover:bg-primary/90">
                  {guestSearching ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Searching...</> : "Track Order"}
                </Button>
              </div>
              {guestOrder && <div className="mt-6"><OrderCard order={guestOrder} /></div>}
            </div>

            {!isLoggedIn && (
              <p className="text-center text-sm text-muted-foreground mt-6">
                <button onClick={() => apiClient.auth.redirectToLogin("/orders")} className="text-primary hover:underline font-medium">Login</button> to see all your order history
              </p>
            )}
          </>
        )}
      </main>
      <Footer />
    </div>
  );
}
