import { useState, useEffect } from "react";
import { Link, useLocation, useNavigate } from "@/lib/next-router";
import {
  Package, ShoppingBag, Tag, Users, BarChart3, Image,
  Store, Menu, Zap, ChevronRight, LogOut, Mail, Star, MessageCircle,
  HelpCircle, Warehouse, UserCog, Shield
} from "lucide-react";
import { apiClient } from "@/api/apiClient";

const ALL_NAV = [
  { key: "orders", icon: ShoppingBag, label: "Orders", path: "/admin/orders" },
  { key: "products", icon: Package, label: "Products", path: "/admin/products" },
  { key: "sellers", icon: Users, label: "Sellers", path: "/admin/sellers" },
  { key: "coupons", icon: Tag, label: "Coupons", path: "/admin/coupons" },
  { key: "banners", icon: Image, label: "Banners", path: "/admin/banners" },
  { key: "analytics", icon: BarChart3, label: "Analytics", path: "/admin/analytics" },
  { key: "messages", icon: Mail, label: "Messages", path: "/admin/messages" },
  { key: "reviews", icon: Star, label: "Reviews", path: "/admin/reviews" },
  { key: "chats", icon: MessageCircle, label: "Product Chats", path: "/admin/chats" },
  { key: "faq", icon: HelpCircle, label: "FAQ", path: "/admin/faq" },
  { key: "inventory", icon: Warehouse, label: "Inventory", path: "/admin/inventory" },
  { key: "flash_sales", icon: Zap, label: "Flash Sales", path: "/admin/flash-sales" },
  { key: "users", icon: Users, label: "Users", path: "/admin/users" },
  { key: "settings", icon: Store, label: "Site Settings", path: "/admin/settings" },
  { key: "staff", icon: UserCog, label: "Staff", path: "/admin/staff" },
];

const PATH_TO_PERMISSION = {
  "/admin/orders": "orders",
  "/admin/products": "products",
  "/admin/sellers": "sellers",
  "/admin/flash-sales": "flash_sales",
  "/admin/coupons": "coupons",
  "/admin/staff": "staff",
  "/admin/messages": "messages",
  "/admin/reviews": "reviews",
  "/admin/chats": "chats",
  "/admin/users": "users",
  "/admin/faq": "faq",
  "/admin/inventory": "inventory",
  "/admin/analytics": "analytics",
  "/admin/banners": "banners",
  "/admin/settings": "settings",
};

export default function StaffLayout({ children, permissions = [] }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [staffInfo, setStaffInfo] = useState(null);
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    apiClient.auth.me().then(async (u) => {
      const perms = await apiClient.entities.StaffPermission.filter({ user_email: u.email, is_active: true }).catch(() => []);
      if (perms.length) setStaffInfo(perms[0]);

      const userPerms = perms.length ? perms[0].permissions || [] : [];
      const requiredPerm = PATH_TO_PERMISSION[location.pathname];
      if (requiredPerm && !userPerms.includes(requiredPerm)) {
        // Fire security alert (non-blocking)
        apiClient.functions.invoke("sendSecurityAlert", {
          userEmail: u.email,
          userName: u.full_name,
          attemptedPermission: requiredPerm,
          pathname: location.pathname
        }).catch(() => {});
        navigate("/staff", { replace: true });
      }
    }).catch(() => {});
  }, [location.pathname]);

  const allowedPerms = staffInfo?.permissions || permissions;
  const navItems = ALL_NAV.filter(n => allowedPerms.includes(n.key));

  return (
    <div className="min-h-screen bg-gray-950 flex">
      {/* Sidebar */}
      <aside className={`fixed lg:sticky top-0 z-40 h-screen w-60 bg-gray-900 border-r border-gray-800 flex flex-col transition-transform duration-300 ${sidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}`}>
        {/* Logo */}
        <div className="p-5 border-b border-gray-800">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
              <Shield className="w-4 h-4 text-white" />
            </div>
            <div>
              <div className="font-poppins font-bold text-white text-sm">Open Market BD</div>
              <div className="text-[10px] text-primary font-semibold uppercase tracking-widest">
                {staffInfo?.role_title || "Staff Panel"}
              </div>
            </div>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 p-3 space-y-0.5 overflow-y-auto">
          {navItems.length === 0 ? (
            <p className="text-gray-500 text-xs px-3 py-4">No sections assigned yet. Contact your admin.</p>
          ) : navItems.map(({ icon: Icon, label, path }) => {
            const active = location.pathname === path;
            return (
              <Link key={path} to={path} onClick={() => setSidebarOpen(false)}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 group ${active ? "bg-primary text-white" : "text-gray-400 hover:text-white hover:bg-gray-800"}`}>
                <Icon className={`w-4 h-4 flex-shrink-0 ${active ? "text-white" : "text-gray-500 group-hover:text-white"}`} />
                {label}
                {active && <ChevronRight className="w-3 h-3 ml-auto" />}
              </Link>
            );
          })}
        </nav>

        {/* Bottom */}
        <div className="p-3 border-t border-gray-800 space-y-1">
          <div className="px-3 py-2 text-xs text-gray-500">
            {staffInfo?.user_email}
          </div>
          <Link to="/" className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-gray-400 hover:text-white hover:bg-gray-800 transition-all">
            <Store className="w-4 h-4" /> View Store
          </Link>
          <button onClick={() => apiClient.auth.logout("/")} className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-gray-400 hover:text-red-400 hover:bg-gray-800 transition-all">
            <LogOut className="w-4 h-4" /> Logout
          </button>
        </div>
      </aside>

      {/* Mobile overlay */}
      {sidebarOpen && <div className="lg:hidden fixed inset-0 z-30 bg-black/60" onClick={() => setSidebarOpen(false)} />}

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-14 bg-gray-900 border-b border-gray-800 flex items-center gap-4 px-4 sticky top-0 z-20">
          <button onClick={() => setSidebarOpen(true)} className="lg:hidden text-gray-400 hover:text-white">
            <Menu className="w-5 h-5" />
          </button>
          <h1 className="text-white font-semibold text-sm flex-1">
            {ALL_NAV.find(n => n.path === location.pathname)?.label || "Staff Dashboard"}
          </h1>
          <Link to="/" className="text-gray-400 hover:text-white text-xs flex items-center gap-1">
            <Store className="w-3.5 h-3.5" /> Store
          </Link>
        </header>
        <main className="flex-1 overflow-auto bg-gray-950 p-4 sm:p-6">
          {children}
        </main>
      </div>
    </div>
  );
}

