import { useState, useEffect } from "react";
import { Link, useNavigate } from "@/lib/next-router";
import { apiClient } from "@/api/apiClient";
import SellerLayout from "@/components/seller/SellerLayout";
import { Button } from "@/components/ui/button";
import {
  Store, Package, TrendingUp, ShoppingBag, Plus, ArrowRight,
  Loader2, AlertCircle, CheckCircle, Clock,
  MessageCircle, Star, Zap, Archive, Eye, DollarSign
} from "lucide-react";
import FallbackImage from "@/components/ui/FallbackImage";
import { getProductImageUrls, normalizeImageUrl } from "@/utils/imageUrls";

const STATUS_COLORS = {
  pending: "bg-yellow-100 text-yellow-700",
  approved: "bg-green-100 text-green-700",
  rejected: "bg-red-100 text-red-700",
};

const ORDER_STATUS_COLORS = {
  pending: "bg-yellow-100 text-yellow-700",
  processing: "bg-blue-100 text-blue-700",
  shipped: "bg-purple-100 text-purple-700",
  delivered: "bg-green-100 text-green-700",
  cancelled: "bg-red-100 text-red-700",
};

export default function SellerDashboard() {
  const [seller, setSeller] = useState(null);
  const [products, setProducts] = useState([]);
  const [orders, setOrders] = useState([]);
  const [chats, setChats] = useState([]);
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    apiClient.auth.me()
      .then(async (user) => {
        const sellers = await apiClient.entities.Seller.filter({ user_id: user.id });
        if (!sellers.length) { navigate("/seller/register"); return; }
        const s = sellers[0];
        setSeller(s);
        if (s.status !== "approved") { setLoading(false); return; }

        const [prods, allOrders, sellerChats] = await Promise.all([
          apiClient.entities.Product.filter({ seller_id: s.id }, "-created_date", 100),
          apiClient.entities.Order.list("-created_date", 100),
          apiClient.entities.ProductChat.filter({ seller_id: s.id }, "-last_message_at", 20),
        ]);

        setProducts(prods);
        setChats(sellerChats);

        const sellerProductIds = new Set(prods.map(p => p.id));
        const relevantOrders = allOrders.filter(o =>
          o.items?.some(item => sellerProductIds.has(item.product_id))
        );
        setOrders(relevantOrders);

        if (prods.length > 0) {
          const reviewPromises = prods.slice(0, 10).map(p =>
            apiClient.entities.Review.filter({ product_id: p.id }).catch(() => [])
          );
          const allReviews = (await Promise.all(reviewPromises)).flat();
          setReviews(allReviews);
        }

        setLoading(false);
      })
      .catch(() => apiClient.auth.redirectToLogin("/seller/dashboard"));
  }, []);

  if (loading) return (
    <SellerLayout>
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    </SellerLayout>
  );

  if (seller && seller.status !== "approved") {
    return (
      <SellerLayout>
        <div className="max-w-lg mx-auto py-20 text-center">
          {seller.status === "pending" ? (
            <>
              <Clock className="w-16 h-16 text-yellow-500 mx-auto mb-4" />
              <h2 className="font-poppins font-bold text-xl mb-2">Application Under Review</h2>
              <p className="text-muted-foreground">Your store <strong>{seller.store_name}</strong> is being reviewed. We'll notify you within 24–48 hours.</p>
            </>
          ) : (
            <>
              <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
              <h2 className="font-poppins font-bold text-xl mb-2">Application {seller.status}</h2>
              <p className="text-muted-foreground">Please contact support for more information.</p>
            </>
          )}
          <Link to="/account" className="mt-6 inline-block">
            <Button variant="outline">Back to Account</Button>
          </Link>
        </div>
      </SellerLayout>
    );
  }

  const totalRevenue = orders.reduce((sum, o) => {
    const myItems = o.items?.filter(item => products.some(p => p.id === item.product_id)) || [];
    return sum + myItems.reduce((s, i) => s + (i.price * i.quantity), 0);
  }, 0);

  const thisMonthRevenue = orders
    .filter(o => {
      const d = new Date(o.created_date);
      const now = new Date();
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    })
    .reduce((sum, o) => {
      const myItems = o.items?.filter(item => products.some(p => p.id === item.product_id)) || [];
      return sum + myItems.reduce((s, i) => s + (i.price * i.quantity), 0);
    }, 0);

  const activeProducts = products.filter(p => p.is_active && p.approval_status === "approved").length;
  const pendingApproval = products.filter(p => p.approval_status === "pending").length;
  const totalSold = products.reduce((s, p) => s + (p.sold_count || 0), 0);
  const avgRating = reviews.length
    ? (reviews.reduce((s, r) => s + r.rating, 0) / reviews.length).toFixed(1)
    : "—";
  const unreadChats = chats.filter(c => !c.is_read_by_seller).length;
  const flashSaleProducts = products.filter(p => p.flash_sale_price && p.flash_sale_end && new Date(p.flash_sale_end) > new Date()).length;
  const outOfStock = products.filter(p => p.stock === 0).length;

  const recentOrders = orders.slice(0, 6);

  const stats = [
    { label: "Total Revenue", value: `৳${totalRevenue.toLocaleString()}`, sub: `৳${thisMonthRevenue.toLocaleString()} this month`, icon: DollarSign, color: "text-green-600 bg-green-50" },
    { label: "Active Products", value: activeProducts, sub: `${products.length} total • ${pendingApproval} pending`, icon: Package, color: "text-blue-600 bg-blue-50" },
    { label: "Total Sold", value: totalSold, sub: `${orders.length} orders`, icon: ShoppingBag, color: "text-purple-600 bg-purple-50" },
    { label: "Avg Rating", value: avgRating, sub: `${reviews.length} reviews`, icon: Star, color: "text-yellow-600 bg-yellow-50" },
  ];

  const quickActions = [
    { label: "Products", icon: Package, to: "/seller/products", color: "bg-blue-50 text-blue-600 border-blue-200" },
    { label: "Inventory", icon: Archive, to: "/seller/inventory", color: "bg-orange-50 text-orange-600 border-orange-200" },
    { label: `Chats${unreadChats > 0 ? ` (${unreadChats})` : ""}`, icon: MessageCircle, to: "/seller/chats", color: unreadChats > 0 ? "bg-primary/10 text-primary border-primary/30" : "bg-purple-50 text-purple-600 border-purple-200" },
    { label: "Flash Sales", icon: Zap, to: "/seller/products", color: "bg-red-50 text-red-600 border-red-200" },
    { label: "View Store", icon: Eye, to: seller ? `/store/${seller.id}` : "/products", color: "bg-green-50 text-green-600 border-green-200" },
  ];

  return (
    <SellerLayout>
      <div className="max-w-6xl mx-auto">

        {/* Header */}
        <div className="bg-gradient-to-r from-primary to-orange-500 rounded-2xl p-6 mb-6 text-white flex flex-col sm:flex-row items-start sm:items-center gap-4">
          <div className="w-16 h-16 bg-white/20 rounded-xl flex items-center justify-center flex-shrink-0 overflow-hidden">
            {seller.logo
              ? <FallbackImage src={normalizeImageUrl(seller.logo)} alt="" className="w-full h-full object-cover" fallback={<Store className="w-8 h-8 text-white" />} />
              : <Store className="w-8 h-8 text-white" />
            }
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="font-poppins font-bold text-2xl">{seller.store_name}</h1>
              <span className="text-xs bg-white/20 text-white px-2 py-0.5 rounded-full font-semibold flex items-center gap-1">
                <CheckCircle className="w-3 h-3" /> Verified
              </span>
            </div>
            <p className="text-white/80 text-sm mt-0.5">{seller.store_description || "Manage your store and grow your business"}</p>
            <p className="text-white/60 text-xs mt-1">{seller.email} • {seller.phone}</p>
          </div>
          <Link to="/seller/products">
            <Button className="bg-white text-primary hover:bg-white/90 font-semibold gap-2">
              <Plus className="w-4 h-4" /> Add Product
            </Button>
          </Link>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          {stats.map(({ label, value, sub, icon: Icon, color }) => (
            <div key={label} className="bg-white rounded-xl border border-border p-4">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-3 ${color}`}>
                <Icon className="w-5 h-5" />
              </div>
              <div className="font-poppins font-bold text-xl">{value}</div>
              <div className="text-muted-foreground text-xs mt-0.5">{label}</div>
              <div className="text-muted-foreground text-[11px] mt-0.5">{sub}</div>
            </div>
          ))}
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-3 sm:grid-cols-5 gap-3 mb-6">
          {quickActions.map(({ label, icon: Icon, to, color }) => (
            <Link key={label} to={to}>
              <div className={`border rounded-xl p-3 text-center hover:scale-105 transition-transform cursor-pointer ${color}`}>
                <Icon className="w-6 h-6 mx-auto mb-1" />
                <div className="text-xs font-semibold">{label}</div>
              </div>
            </Link>
          ))}
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Left: Products + Orders */}
          <div className="lg:col-span-2 space-y-6">
            {/* Products */}
            <div className="bg-white rounded-xl border border-border p-5">
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-poppins font-semibold">My Products</h2>
                <Link to="/seller/products" className="text-primary text-sm font-medium flex items-center gap-1 hover:underline">
                  Manage All <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
              {products.length === 0 ? (
                <div className="text-center py-10">
                  <ShoppingBag className="w-12 h-12 text-gray-200 mx-auto mb-3" />
                  <p className="text-muted-foreground text-sm mb-3">No products yet</p>
                  <Link to="/seller/products">
                    <Button size="sm" className="bg-primary hover:bg-primary/90 gap-1.5"><Plus className="w-3.5 h-3.5" /> Add First Product</Button>
                  </Link>
                </div>
              ) : (
                <div className="space-y-2">
                  {products.slice(0, 8).map(p => (
                    <div key={p.id} className="flex items-center gap-3 p-2.5 rounded-lg hover:bg-muted/30 transition-colors">
                      <div className="w-11 h-11 bg-gray-100 rounded-lg overflow-hidden flex-shrink-0">
                        <FallbackImage sources={getProductImageUrls(p)} alt="" className="w-full h-full object-cover" fallback={<Package className="w-5 h-5 m-3 text-gray-400" />} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm line-clamp-1">{p.name}</p>
                        <div className="flex gap-2 text-xs text-muted-foreground">
                          <span>৳{p.price?.toLocaleString()}</span>
                          <span>•</span>
                          <span>Stock: {p.stock}</span>
                          <span>•</span>
                          <span>Sold: {p.sold_count || 0}</span>
                        </div>
                      </div>
                      <div className="flex flex-col items-end gap-1">
                        <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full capitalize ${STATUS_COLORS[p.approval_status] || "bg-gray-100 text-gray-600"}`}>
                          {p.approval_status}
                        </span>
                        {p.flash_sale_price && p.flash_sale_end && new Date(p.flash_sale_end) > new Date() && (
                          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-red-100 text-red-600 flex items-center gap-0.5">
                            <Zap className="w-2.5 h-2.5" /> Sale
                          </span>
                        )}
                        {p.stock === 0 && <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-red-50 text-red-500">Out of stock</span>}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Recent Orders */}
            <div className="bg-white rounded-xl border border-border p-5">
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-poppins font-semibold">Recent Orders</h2>
                <span className="text-xs text-muted-foreground">{orders.length} total</span>
              </div>
              {recentOrders.length === 0 ? (
                <div className="text-center py-8">
                  <ShoppingBag className="w-12 h-12 text-gray-200 mx-auto mb-3" />
                  <p className="text-muted-foreground text-sm">No orders yet</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {recentOrders.map(order => {
                    const myItems = order.items?.filter(item => products.some(p => p.id === item.product_id)) || [];
                    const myTotal = myItems.reduce((s, i) => s + (i.price * i.quantity), 0);
                    return (
                      <div key={order.id} className="flex items-center gap-3 p-2.5 rounded-lg hover:bg-muted/30 transition-colors">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-sm">{order.order_number}</span>
                            <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full capitalize ${ORDER_STATUS_COLORS[order.status] || "bg-gray-100 text-gray-600"}`}>{order.status}</span>
                          </div>
                          <p className="text-xs text-muted-foreground">{order.customer_name} • {myItems.length} item(s)</p>
                        </div>
                        <div className="text-right">
                          <p className="font-semibold text-sm text-primary">৳{myTotal.toLocaleString()}</p>
                          <p className="text-[10px] text-muted-foreground">{new Date(order.created_date).toLocaleDateString("en-BD", { month: "short", day: "numeric" })}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Right column */}
          <div className="space-y-4">
            {/* Chats */}
            <div className="bg-white rounded-xl border border-border p-5">
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-poppins font-semibold flex items-center gap-2">
                  <MessageCircle className="w-4 h-4 text-primary" /> Customer Chats
                  {unreadChats > 0 && <span className="w-5 h-5 bg-primary text-white text-[10px] rounded-full flex items-center justify-center font-bold">{unreadChats}</span>}
                </h2>
                <Link to="/seller/chats" className="text-primary text-sm font-medium hover:underline">View All</Link>
              </div>
              {chats.length === 0 ? (
                <p className="text-muted-foreground text-sm text-center py-4">No customer chats yet</p>
              ) : (
                <div className="space-y-2">
                  {chats.slice(0, 5).map(chat => (
                    <Link key={chat.id} to="/seller/chats">
                      <div className={`p-2.5 rounded-lg hover:bg-muted/30 transition-colors border ${!chat.is_read_by_seller ? "border-primary/30 bg-primary/5" : "border-transparent"}`}>
                        <div className="flex items-start justify-between">
                          <div className="min-w-0">
                            <p className="font-medium text-sm">{chat.buyer_name}</p>
                            <p className="text-xs text-muted-foreground truncate">{chat.product_name}</p>
                            {chat.messages?.length > 0 && (
                              <p className="text-xs text-muted-foreground truncate mt-0.5 italic">"{chat.messages[chat.messages.length - 1].text}"</p>
                            )}
                          </div>
                          {!chat.is_read_by_seller && <span className="w-2 h-2 rounded-full bg-primary flex-shrink-0 mt-1" />}
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </div>

            {/* Recent Reviews */}
            <div className="bg-white rounded-xl border border-border p-5">
              <h2 className="font-poppins font-semibold flex items-center gap-2 mb-4">
                <Star className="w-4 h-4 text-yellow-500" /> Recent Reviews
              </h2>
              {reviews.length === 0 ? (
                <p className="text-muted-foreground text-sm text-center py-4">No reviews yet</p>
              ) : (
                <div className="space-y-3">
                  {reviews.slice(0, 4).map(r => (
                    <div key={r.id} className="p-2.5 bg-muted/30 rounded-lg">
                      <div className="flex gap-0.5 mb-1">
                        {[1,2,3,4,5].map(s => (
                          <Star key={s} className={`w-3 h-3 ${s <= r.rating ? "text-yellow-400 fill-yellow-400" : "text-gray-200 fill-gray-200"}`} />
                        ))}
                      </div>
                      <p className="text-xs font-medium">{r.customer_name || "Customer"}</p>
                      <p className="text-xs text-muted-foreground">{r.product_name}</p>
                      {r.body && <p className="text-xs text-muted-foreground mt-1 line-clamp-2">"{r.body}"</p>}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Store Health */}
            <div className="bg-white rounded-xl border border-border p-5">
              <h2 className="font-poppins font-semibold mb-3">Store Health</h2>
              <div className="space-y-2 text-sm">
                {[
                  { label: "Active Products", ok: activeProducts > 0, value: activeProducts },
                  { label: "Pending Approval", ok: pendingApproval === 0, value: pendingApproval },
                  { label: "Out of Stock", ok: outOfStock === 0, value: outOfStock },
                  { label: "Flash Sales Active", ok: flashSaleProducts > 0, value: flashSaleProducts, optional: true },
                  { label: "Unread Chats", ok: unreadChats === 0, value: unreadChats },
                ].map(({ label, ok, value, optional }) => (
                  <div key={label} className="flex items-center justify-between">
                    <span className="text-muted-foreground">{label}</span>
                    <div className="flex items-center gap-1.5">
                      <span className="font-semibold">{value}</span>
                      <div className={`w-2 h-2 rounded-full ${ok ? "bg-green-500" : optional ? "bg-gray-300" : "bg-red-400"}`} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </SellerLayout>
  );
}

