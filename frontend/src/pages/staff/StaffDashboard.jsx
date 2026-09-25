import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { apiClient } from "@/api/apiClient";
import StaffLayout from "@/components/staff/StaffLayout";
import {
  ShoppingBag, Package, Users, Tag, Image, BarChart3, Mail,
  Star, MessageCircle, HelpCircle, Warehouse, Zap, Store, UserCog, Loader2, Shield
} from "lucide-react";

const ALL_TILES = [
  { key: "orders", icon: ShoppingBag, label: "Orders", path: "/admin/orders", color: "bg-blue-900/40 border-blue-700 text-blue-400" },
  { key: "products", icon: Package, label: "Products", path: "/admin/products", color: "bg-green-900/40 border-green-700 text-green-400" },
  { key: "sellers", icon: Users, label: "Sellers", path: "/admin/sellers", color: "bg-purple-900/40 border-purple-700 text-purple-400" },
  { key: "coupons", icon: Tag, label: "Coupons", path: "/admin/coupons", color: "bg-yellow-900/40 border-yellow-700 text-yellow-400" },
  { key: "banners", icon: Image, label: "Banners", path: "/admin/banners", color: "bg-pink-900/40 border-pink-700 text-pink-400" },
  { key: "analytics", icon: BarChart3, label: "Analytics", path: "/admin/analytics", color: "bg-indigo-900/40 border-indigo-700 text-indigo-400" },
  { key: "messages", icon: Mail, label: "Messages", path: "/admin/messages", color: "bg-red-900/40 border-red-700 text-red-400" },
  { key: "reviews", icon: Star, label: "Reviews", path: "/admin/reviews", color: "bg-orange-900/40 border-orange-700 text-orange-400" },
  { key: "chats", icon: MessageCircle, label: "Product Chats", path: "/admin/chats", color: "bg-teal-900/40 border-teal-700 text-teal-400" },
  { key: "faq", icon: HelpCircle, label: "FAQ", path: "/admin/faq", color: "bg-cyan-900/40 border-cyan-700 text-cyan-400" },
  { key: "inventory", icon: Warehouse, label: "Inventory", path: "/admin/inventory", color: "bg-amber-900/40 border-amber-700 text-amber-400" },
  { key: "flash_sales", icon: Zap, label: "Flash Sales", path: "/admin/flash-sales", color: "bg-rose-900/40 border-rose-700 text-rose-400" },
  { key: "users", icon: Users, label: "Users", path: "/admin/users", color: "bg-sky-900/40 border-sky-700 text-sky-400" },
  { key: "settings", icon: Store, label: "Site Settings", path: "/admin/settings", color: "bg-slate-800 border-slate-600 text-slate-400" },
  { key: "staff", icon: UserCog, label: "Staff", path: "/admin/staff", color: "bg-violet-900/40 border-violet-700 text-violet-400" },
];

export default function StaffDashboard() {
  const [staffInfo, setStaffInfo] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    apiClient.auth.me()
      .then(async (user) => {
        if (user.role === "admin") {
          navigate("/admin");
          return;
        }

        const perms = await apiClient.entities.StaffPermission.filter({ user_email: user.email, is_active: true }).catch(() => []);
        const activePermissionRecord = Array.isArray(perms)
          ? perms.find((entry) => Array.isArray(entry.permissions) && entry.permissions.length > 0)
          : null;

        const fallbackPerms = activePermissionRecord?.permissions || [];
        setStaffInfo({
          ...(activePermissionRecord || { permissions: [], role_title: "Staff Panel" }),
          user,
          permissions: fallbackPerms,
        });
        setLoading(false);
      })
      .catch(() => apiClient.auth.redirectToLogin("/staff"));
  }, []);

  if (loading) return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center">
      <Loader2 className="w-8 h-8 animate-spin text-primary" />
    </div>
  );

  const tiles = ALL_TILES.filter(t => staffInfo?.permissions?.includes(t.key));

  return (
    <StaffLayout permissions={staffInfo?.permissions || []}>
      <div className="space-y-6">
        {/* Welcome */}
        <div className="bg-gradient-to-r from-gray-800 to-gray-900 rounded-2xl border border-gray-700 p-6">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 bg-primary/20 rounded-2xl flex items-center justify-center">
              <Shield className="w-7 h-7 text-primary" />
            </div>
            <div>
              <h1 className="text-white font-poppins font-bold text-xl">Welcome, {staffInfo?.user?.full_name?.split(" ")[0] || "Staff"}</h1>
              <p className="text-gray-400 text-sm mt-0.5">{staffInfo?.role_title} — {tiles.length} section{tiles.length !== 1 ? "s" : ""} accessible</p>
            </div>
          </div>
        </div>

        {/* Sections grid */}
        {tiles.length === 0 ? (
          <div className="bg-gray-900 rounded-2xl border border-gray-800 p-16 text-center">
            <Shield className="w-12 h-12 mx-auto text-gray-700 mb-3" />
            <p className="text-gray-400">No sections have been assigned to you yet. Contact your administrator.</p>
          </div>
        ) : (
          <div>
            <h2 className="text-gray-300 font-semibold mb-4">Your Accessible Sections</h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
              {tiles.map(({ key, icon: Icon, label, path, color }) => (
                <Link key={key} to={path}>
                  <div className={`border rounded-2xl p-5 flex flex-col items-center gap-3 hover:scale-105 transition-transform cursor-pointer ${color}`}>
                    <Icon className="w-8 h-8" />
                    <span className="text-sm font-semibold text-white">{label}</span>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>
    </StaffLayout>
  );
}

