import { useState, useEffect, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import { apiClient } from "@/api/apiClient";
import { uploadImageWithSizeCheck } from "@/utils/imageUpload";
import { useToast } from "@/components/ui/use-toast";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import AddressSelector from "@/components/ui/AddressSelector";
import { parseAddressString, formatAddressString } from "@/lib/addressUtils";
import {
  User, Package, Heart, Settings, LogOut, Edit2, Save, X,
  ShoppingBag, MapPin, Phone, Mail, ChevronRight, Loader2, Store, Star, Camera
} from "lucide-react";

const STATUS_COLORS = {
  pending: "bg-yellow-100 text-yellow-700",
  processing: "bg-blue-100 text-blue-700",
  shipped: "bg-purple-100 text-purple-700",
  delivered: "bg-green-100 text-green-700",
  cancelled: "bg-red-100 text-red-700",
  refunded: "bg-gray-100 text-gray-700",
};

const TABS = [
  { id: "profile", label: "Profile", icon: User },
  { id: "orders", label: "My Orders", icon: Package },
  { id: "wishlist", label: "Wishlist", icon: Heart },
  { id: "seller", label: "Seller", icon: Store },
  { id: "settings", label: "Settings", icon: Settings },
];

// Icon is used as a component variable from TABS mapping — this is intentional

export default function Account() {
  const [user, setUser] = useState(null);
  const [sellerProfile, setSellerProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState("profile");
  const [orders, setOrders] = useState([]);
  const [wishlist, setWishlist] = useState([]);
  const [cart, setCart] = useState(() => {
    try { return JSON.parse(localStorage.getItem("cart") || "[]"); } catch { return []; }
  });
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({
    full_name: "",
    phone: "",
    address: "",
    addressParts: { street: "", area: "", district: "", division: "" },
  });
  const [saving, setSaving] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const avatarRef = useRef();
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    apiClient.auth.me()
      .then(async u => {
        setUser(u);
        const addressParts = parseAddressString(u.address || "");
        setForm({ full_name: u.full_name || "", phone: u.phone || "", address: u.address || "", addressParts });
        const [orders, wishlist, sellers] = await Promise.all([
          apiClient.entities.Order.filter({ customer_email: u.email }, "-created_date", 20),
          apiClient.entities.Wishlist.filter({ created_by: u.email }),
          apiClient.entities.Seller.filter({ user_id: u.id }).catch(() => [])
        ]);
        setOrders(orders);
        setWishlist(wishlist);
        if (sellers.length > 0) setSellerProfile(sellers[0]);
        setLoading(false);
      })
      .catch(() => {
        apiClient.auth.redirectToLogin("/account");
      });
  }, []);

  const handleSaveProfile = async () => {
    setSaving(true);
    const address = formatAddressString(form.addressParts);
    await apiClient.auth.updateMe({ phone: form.phone, address });
    setUser({ ...user, phone: form.phone, address });
    setForm((current) => ({ ...current, address }));
    setSaving(false);
    setEditing(false);
    toast({ title: "Profile updated!" });
  };

  const handleAvatarUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingAvatar(true);
    try {
      const { file_url } = await uploadImageWithSizeCheck(file, (message) => toast({ title: message, variant: 'destructive' }));
      await apiClient.auth.updateMe({ profile_picture: file_url });
      setUser({ ...user, profile_picture: file_url });
      toast({ title: "Profile picture updated!" });
    } catch (error) {
      toast({ title: error.message || 'File upload failed', variant: 'destructive' });
    }
    setUploadingAvatar(false);
    e.target.value = "";
  };

  const removeFromWishlist = async (item) => {
    await apiClient.entities.Wishlist.delete(item.id);
    setWishlist(wishlist.filter(w => w.id !== item.id));
    toast({ title: "Removed from wishlist" });
  };

  const addToCart = (item) => {
    const existing = cart.find(c => c.product_id === item.product_id);
    const newCart = existing
      ? cart.map(c => c.product_id === item.product_id ? { ...c, quantity: c.quantity + 1 } : c)
      : [...cart, { product_id: item.product_id, product_name: item.product_name, product_image: item.product_image, quantity: 1, price: item.product_price }];
    setCart(newCart);
    localStorage.setItem("cart", JSON.stringify(newCart));
    toast({ title: "Added to cart!", description: item.product_name });
  };

  if (loading) return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <Loader2 className="w-8 h-8 animate-spin text-primary" />
    </div>
  );

  return (
    <div className="min-h-screen bg-background">
      <Navbar cart={cart} wishlistCount={wishlist.length} />
      <main className="max-w-5xl mx-auto px-4 py-6">
        {/* Header */}
        <div className="bg-white rounded-2xl border border-border p-6 mb-6 flex flex-col sm:flex-row items-center sm:items-start gap-4">
          <div className="relative flex-shrink-0 group cursor-pointer" onClick={() => avatarRef.current?.click()}>
            <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center overflow-hidden border-2 border-border">
              {uploadingAvatar
                ? <Loader2 className="w-6 h-6 animate-spin text-primary" />
                : user?.profile_picture
                  ? <img src={user.profile_picture} alt="" className="w-full h-full object-cover" />
                  : <User className="w-8 h-8 text-primary" />}
            </div>
            <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-primary rounded-full flex items-center justify-center shadow-md group-hover:bg-primary/80 transition-colors">
              <Camera className="w-3 h-3 text-white" />
            </div>
            <input ref={avatarRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarUpload} />
          </div>
          <div className="text-center sm:text-left flex-1">
            <h1 className="font-poppins font-bold text-xl">{user?.full_name || "User"}</h1>
            <p className="text-muted-foreground text-sm">{user?.email}</p>
            <div className="flex gap-3 mt-2 justify-center sm:justify-start flex-wrap">
              <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full font-medium">{orders.length} Orders</span>
              <span className="text-xs bg-pink-100 text-pink-600 px-2 py-0.5 rounded-full font-medium">{wishlist.length} Wishlist</span>
            </div>
          </div>
          <Button variant="outline" size="sm" onClick={() => apiClient.auth.logout("/")} className="flex items-center gap-1.5 text-destructive border-destructive/30 hover:bg-destructive/5">
            <LogOut className="w-4 h-4" /> Logout
          </Button>
        </div>

        <div className="flex flex-col lg:flex-row gap-6">
          {/* Sidebar tabs */}
          <aside className="lg:w-48 flex-shrink-0">
            <div className="bg-white rounded-xl border border-border p-2 flex lg:flex-col gap-1">
              {TABS.map(({ id, label, icon: Icon }) => (
                <button key={id} onClick={() => setTab(id)}
                  className={`flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm font-medium transition-all w-full text-left ${tab === id ? "bg-primary text-white" : "text-muted-foreground hover:text-foreground hover:bg-muted"}`}>
                  <Icon className="w-4 h-4 flex-shrink-0" />
                  <span className="hidden lg:inline">{label}</span>
                </button>
              ))}
            </div>
          </aside>

          {/* Content */}
          <div className="flex-1 min-w-0">
            {/* PROFILE TAB */}
            {tab === "profile" && (
              <div className="bg-white rounded-xl border border-border p-5">
                <div className="flex items-center justify-between mb-5">
                  <h2 className="font-poppins font-bold text-lg">Personal Information</h2>
                  {!editing ? (
                    <Button variant="outline" size="sm" onClick={() => setEditing(true)} className="gap-1.5">
                      <Edit2 className="w-3.5 h-3.5" /> Edit
                    </Button>
                  ) : (
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" onClick={() => setEditing(false)}><X className="w-3.5 h-3.5" /></Button>
                      <Button size="sm" onClick={handleSaveProfile} disabled={saving} className="bg-primary hover:bg-primary/90 gap-1.5">
                        {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />} Save
                      </Button>
                    </div>
                  )}
                </div>
                <div className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <Label className="text-xs text-muted-foreground">Full Name</Label>
                      <div className="flex items-center gap-2 mt-1 p-2.5 bg-muted/30 rounded-lg">
                        <User className="w-4 h-4 text-muted-foreground" />
                        <span className="text-sm">{user?.full_name}</span>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">Name cannot be changed here</p>
                    </div>
                    <div>
                      <Label className="text-xs text-muted-foreground">Email Address</Label>
                      <div className="flex items-center gap-2 mt-1 p-2.5 bg-muted/30 rounded-lg">
                        <Mail className="w-4 h-4 text-muted-foreground" />
                        <span className="text-sm">{user?.email}</span>
                      </div>
                    </div>
                    <div>
                      <Label className="text-xs text-muted-foreground">Phone Number</Label>
                      {editing ? (
                        <Input value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} placeholder="01XXXXXXXXX" className="mt-1" />
                      ) : (
                        <div className="flex items-center gap-2 mt-1 p-2.5 bg-muted/30 rounded-lg">
                          <Phone className="w-4 h-4 text-muted-foreground" />
                          <span className="text-sm">{user?.phone || <span className="text-muted-foreground italic">Not set</span>}</span>
                        </div>
                      )}
                    </div>
                    <div>
                      <Label className="text-xs text-muted-foreground">Member Since</Label>
                      <div className="flex items-center gap-2 mt-1 p-2.5 bg-muted/30 rounded-lg">
                        <ShoppingBag className="w-4 h-4 text-muted-foreground" />
                        <span className="text-sm">{new Date(user?.created_date).toLocaleDateString("en-BD", { year: "numeric", month: "long" })}</span>
                      </div>
                    </div>
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Default Address</Label>
                    {editing ? (
                      <div className="mt-2">
                        <AddressSelector
                          value={form.addressParts}
                          onChange={(addressParts) => setForm({ ...form, addressParts })}
                        />
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 mt-1 p-2.5 bg-muted/30 rounded-lg">
                        <MapPin className="w-4 h-4 text-muted-foreground" />
                        <span className="text-sm">{user?.address || <span className="text-muted-foreground italic">No address saved</span>}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* ORDERS TAB */}
            {tab === "orders" && (
              <div className="space-y-3">
                <h2 className="font-poppins font-bold text-lg">My Orders ({orders.length})</h2>
                {orders.length === 0 ? (
                  <div className="bg-white rounded-xl border border-border p-12 text-center">
                    <Package className="w-12 h-12 mx-auto text-gray-200 mb-3" />
                    <p className="font-medium text-muted-foreground">No orders yet</p>
                    <Link to="/products"><Button className="mt-4 bg-primary hover:bg-primary/90" size="sm">Start Shopping</Button></Link>
                  </div>
                ) : orders.map(order => (
                  <div key={order.id} className="bg-white rounded-xl border border-border p-4">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
                      <div>
                        <span className="font-poppins font-bold text-sm">{order.order_number}</span>
                        <p className="text-xs text-muted-foreground mt-0.5">{new Date(order.created_date).toLocaleDateString("en-BD", { year: "numeric", month: "short", day: "numeric" })}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full capitalize ${STATUS_COLORS[order.status] || "bg-gray-100 text-gray-700"}`}>{order.status}</span>
                        <span className="font-poppins font-bold text-primary">৳{order.total?.toLocaleString()}</span>
                      </div>
                    </div>
                    <div className="flex gap-2 overflow-x-auto">
                      {order.items?.slice(0, 4).map((item, i) => (
                        <div key={i} className="flex-shrink-0 flex items-center gap-2 bg-muted/30 rounded-lg p-2 text-xs">
                          {item.product_image && <img src={item.product_image} alt="" className="w-8 h-8 object-cover rounded" />}
                          <div>
                            <p className="font-medium line-clamp-1 max-w-[100px]">{item.product_name}</p>
                            <p className="text-muted-foreground">x{item.quantity}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                    <Link to="/orders" className="mt-2 text-primary text-xs font-medium flex items-center gap-1 hover:underline">
                      Track Order <ChevronRight className="w-3 h-3" />
                    </Link>
                  </div>
                ))}
              </div>
            )}

            {/* WISHLIST TAB */}
            {tab === "wishlist" && (
              <div>
                <h2 className="font-poppins font-bold text-lg mb-3">Wishlist ({wishlist.length})</h2>
                {wishlist.length === 0 ? (
                  <div className="bg-white rounded-xl border border-border p-12 text-center">
                    <Heart className="w-12 h-12 mx-auto text-gray-200 mb-3" />
                    <p className="font-medium text-muted-foreground">Your wishlist is empty</p>
                    <Link to="/products"><Button className="mt-4 bg-primary hover:bg-primary/90" size="sm">Browse Products</Button></Link>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {wishlist.map(item => (
                      <div key={item.id} className="bg-white rounded-xl border border-border p-4 flex gap-3">
                        <Link to={`/product/${item.product_id}`} className="w-16 h-16 bg-gray-50 rounded-lg overflow-hidden flex-shrink-0">
                          {item.product_image ? <img src={item.product_image} alt={item.product_name} className="w-full h-full object-cover" /> : <Heart className="w-6 h-6 text-gray-200 m-5" />}
                        </Link>
                        <div className="flex-1 min-w-0">
                          <Link to={`/product/${item.product_id}`}><p className="font-medium text-sm line-clamp-2 hover:text-primary transition-colors">{item.product_name}</p></Link>
                          <p className="font-poppins font-bold text-primary text-sm mt-1">৳{item.product_price?.toLocaleString()}</p>
                          <div className="flex gap-2 mt-2">
                            <Button size="sm" onClick={() => addToCart(item)} className="bg-primary hover:bg-primary/90 h-7 text-xs px-3">Add to Cart</Button>
                            <button onClick={() => removeFromWishlist(item)} className="p-1 text-muted-foreground hover:text-destructive transition-colors">
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* SELLER TAB */}
            {tab === "seller" && (
              <div className="space-y-4">
                <h2 className="font-poppins font-bold text-lg">Seller Center</h2>
                {!sellerProfile ? (
                  <div className="bg-white rounded-xl border border-border p-8 text-center">
                    <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
                      <Store className="w-8 h-8 text-primary" />
                    </div>
                    <h3 className="font-poppins font-bold text-lg mb-2">Become a Seller</h3>
                    <p className="text-muted-foreground text-sm mb-6 max-w-sm mx-auto">
                      Start selling your products on Open Market BD and reach thousands of customers across Bangladesh.
                    </p>
                    <Link to="/seller/register">
                      <Button className="bg-primary hover:bg-primary/90 gap-2">
                        <Store className="w-4 h-4" /> Apply Now
                      </Button>
                    </Link>
                  </div>
                ) : sellerProfile.status === "pending" ? (
                  <div className="bg-white rounded-xl border border-border p-6">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-12 h-12 bg-yellow-100 rounded-xl flex items-center justify-center">
                        <Store className="w-6 h-6 text-yellow-600" />
                      </div>
                      <div>
                        <h3 className="font-semibold">{sellerProfile.store_name}</h3>
                        <span className="text-xs bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded-full font-semibold">Application Under Review</span>
                      </div>
                    </div>
                    <p className="text-muted-foreground text-sm">Your application is being reviewed by our team. We'll notify you at <strong>{user?.email}</strong> within 24–48 hours.</p>
                  </div>
                ) : sellerProfile.status === "approved" ? (
                  <div className="bg-white rounded-xl border border-border p-6 space-y-4">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
                        <Store className="w-6 h-6 text-green-600" />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <h3 className="font-semibold">{sellerProfile.store_name}</h3>
                          <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-semibold">✓ Approved</span>
                        </div>
                        <p className="text-xs text-muted-foreground">{sellerProfile.email}</p>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="bg-muted/30 rounded-xl p-3 text-center">
                        <div className="font-poppins font-bold text-xl">{sellerProfile.total_products || 0}</div>
                        <div className="text-xs text-muted-foreground">Total Products</div>
                      </div>
                      <div className="bg-muted/30 rounded-xl p-3 text-center">
                        <div className="font-poppins font-bold text-xl text-primary">৳{(sellerProfile.total_sales || 0).toLocaleString()}</div>
                        <div className="text-xs text-muted-foreground">Total Sales</div>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Link to="/seller/dashboard" className="flex-1">
                        <Button className="w-full bg-primary hover:bg-primary/90 gap-2"><Store className="w-4 h-4" /> Seller Dashboard</Button>
                      </Link>
                      <Link to="/seller/products" className="flex-1">
                        <Button variant="outline" className="w-full gap-2"><Package className="w-4 h-4" /> My Products</Button>
                      </Link>
                    </div>
                  </div>
                ) : (
                  <div className="bg-white rounded-xl border border-border p-6 text-center">
                    <p className="text-muted-foreground">Your seller account status: <span className="font-semibold capitalize text-red-600">{sellerProfile.status}</span>. Please contact support.</p>
                  </div>
                )}
              </div>
            )}

            {/* SETTINGS TAB */}
            {tab === "settings" && (
              <div className="bg-white rounded-xl border border-border p-5 space-y-4">
                <h2 className="font-poppins font-bold text-lg">Account Settings</h2>
                <div className="space-y-3">
                  <div className="flex items-center justify-between p-3 rounded-lg hover:bg-muted/30 transition-colors">
                    <div>
                      <p className="font-medium text-sm">Email Notifications</p>
                      <p className="text-xs text-muted-foreground">Receive order updates via email</p>
                    </div>
                    <Badge className="bg-green-100 text-green-700">Active</Badge>
                  </div>
                  <div className="border-t border-border" />
                  <div className="flex items-center justify-between p-3 rounded-lg hover:bg-muted/30 transition-colors">
                    <div>
                      <p className="font-medium text-sm">Account Role</p>
                      <p className="text-xs text-muted-foreground">Your current access level</p>
                    </div>
                    <Badge className="bg-primary/10 text-primary capitalize">{user?.role || "user"}</Badge>
                  </div>
                  {user?.role === "admin" && (
                    <>
                      <div className="border-t border-border" />
                      <Link to="/admin" className="flex items-center justify-between p-3 rounded-lg hover:bg-muted/30 transition-colors">
                        <div>
                          <p className="font-medium text-sm">Admin Dashboard</p>
                          <p className="text-xs text-muted-foreground">Manage products, orders and settings</p>
                        </div>
                        <ChevronRight className="w-4 h-4 text-muted-foreground" />
                      </Link>
                    </>
                  )}
                  <div className="border-t border-border" />
                  <button onClick={() => apiClient.auth.logout("/")} className="w-full flex items-center justify-between p-3 rounded-lg hover:bg-red-50 transition-colors text-destructive">
                    <div className="text-left">
                      <p className="font-medium text-sm">Sign Out</p>
                      <p className="text-xs text-destructive/70">You will be logged out of your account</p>
                    </div>
                    <LogOut className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}

