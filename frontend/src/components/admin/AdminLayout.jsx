import { useState, useEffect, useRef } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { LayoutDashboard, Package, ShoppingBag, Tag, Users, User, BarChart3, Image, Store, Menu, Zap, ChevronRight, LogOut, Mail, Star, MessageCircle, HelpCircle, Warehouse, UserCog } from "lucide-react";
import { apiClient } from "@/api/apiClient";

// Module-level cache — survives re-renders, resets on full page reload only
let _cachedUser = null;
let _cachedPerms = null; // null=admin(all), array=staff perms

const NAV_ITEMS = [
  { icon: LayoutDashboard, label: "Dashboard", path: "/admin" },
  { icon: Package, label: "Products", path: "/admin/products" },
  { icon: ShoppingBag, label: "Orders", path: "/admin/orders" },
  { icon: Zap, label: "Flash Sales", path: "/admin/flash-sales" },
  { icon: Tag, label: "Coupons", path: "/admin/coupons" },
  { icon: Users, label: "Sellers", path: "/admin/sellers" },
  { icon: User, label: "Users", path: "/admin/users" },
  { icon: UserCog, label: "Staff", path: "/admin/staff" },
  { icon: Mail, label: "Messages", path: "/admin/messages" },
  { icon: Star, label: "Reviews", path: "/admin/reviews" },
  { icon: MessageCircle, label: "Product Chats", path: "/admin/chats" },
  { icon: HelpCircle, label: "FAQ", path: "/admin/faq" },
  { icon: Warehouse, label: "Inventory", path: "/admin/inventory" },
  { icon: BarChart3, label: "Analytics", path: "/admin/analytics" },
  { icon: Image, label: "Banners", path: "/admin/banners" },
  { icon: Store, label: "Site Settings", path: "/admin/settings" },
];

// Maps route path → permission key
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

export default function AdminLayout({ children }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [staffPermissions, setStaffPermissions] = useState(_cachedPerms); // start from cache if available
  const [currentUser, setCurrentUser] = useState(_cachedUser);
  const initialized = useRef(false);
  const location = useLocation();
  const navigate = useNavigate();
  const dashboardPath = currentUser?.role === 'admin' ? '/admin' : '/staff';
  const dashboardLabel = currentUser?.role === 'admin' ? 'Dashboard' : 'Staff Dashboard';

  // Load user + permissions ONCE per page load (not on every navigation)
  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;

    apiClient.entities.ContactMessage.filter({ status: "new" }).then(m => setUnreadCount(m.length)).catch(() => {});

    // If already cached, skip the fetch
    if (_cachedUser !== null) return;

    apiClient.auth.me().then(async (u) => {
      _cachedUser = u;
      setCurrentUser(u);

      if (u.role === "admin") {
        _cachedPerms = null; // null = show all
        setStaffPermissions(null);
        return;
      }

      // Non-admin: fetch staff permissions once
      const perms = await apiClient.entities.StaffPermission.filter({ user_email: u.email, is_active: true }).catch(() => []);
      const userPerms = perms.length ? perms[0].permissions || [] : [];
      _cachedPerms = userPerms;
      setStaffPermissions(userPerms);
    }).catch(() => {});
  }, []);

  // Access guard — runs on every navigation but only does a cheap in-memory check
  useEffect(() => {
    if (staffPermissions === null) return; // admin, all allowed
    if (!currentUser) return; // still loading

    const requiredPerm = PATH_TO_PERMISSION[location.pathname] || (location.pathname === "/admin" ? "dashboard" : null);
    if (requiredPerm && !staffPermissions.includes(requiredPerm)) {
      apiClient.functions.invoke("sendSecurityAlert", {
        userEmail: currentUser.email,
        userName: currentUser.full_name,
        attemptedPermission: requiredPerm,
        pathname: location.pathname
      }).catch(() => {});
      navigate("/staff", { replace: true });
    }
  }, [location.pathname, staffPermissions, currentUser, navigate]);

  return (
    <div className="min-h-screen bg-gray-950 flex">
      {/* Sidebar */}
      <aside className={`fixed lg:sticky top-0 z-40 h-screen w-60 bg-gray-900 border-r border-gray-800 flex flex-col transition-transform duration-300 ${sidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}`}>
        {/* Logo */}
        <div className="p-5 border-b border-gray-800">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
              <span className="text-white font-poppins font-black text-xs">OM</span>
            </div>
            <div>
              <div className="font-poppins font-bold text-white text-sm">Open Market BD</div>
              <div className="text-[10px] text-primary font-semibold uppercase tracking-widest">Admin Panel</div>
            </div>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 p-3 space-y-0.5 overflow-y-auto">
          {(staffPermissions === null ? NAV_ITEMS : NAV_ITEMS.filter(n => {
            if (n.path === "/admin") return true;
            return staffPermissions.includes(PATH_TO_PERMISSION[n.path]);
          })).map((item) => {
            const navItem = item.path === '/admin'
              ? { ...item, path: dashboardPath, label: dashboardLabel }
              : item;
            const { icon: Icon, label, path } = navItem;
            const active = location.pathname === path;
            return (
              <Link key={path} to={path} onClick={() => setSidebarOpen(false)}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 group ${active ? "bg-primary text-white" : "text-gray-400 hover:text-white hover:bg-gray-800"}`}>
                <Icon className={`w-4 h-4 flex-shrink-0 ${active ? "text-white" : "text-gray-500 group-hover:text-white"}`} />
                {label}
                {path === "/admin/messages" && unreadCount > 0 && (
                  <span className="ml-auto bg-primary text-white text-xs font-bold w-5 h-5 rounded-full flex items-center justify-center">{unreadCount}</span>
                )}
                {active && path !== "/admin/messages" && <ChevronRight className="w-3 h-3 ml-auto" />}
              </Link>
            );
          })}
        </nav>

        {/* Bottom actions */}
        <div className="p-3 border-t border-gray-800 space-y-1">
          <Link to="/" className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-gray-400 hover:text-white hover:bg-gray-800 transition-all">
            <Store className="w-4 h-4" /> View Store
          </Link>
          <button onClick={() => apiClient.auth.logout('/login')} className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-gray-400 hover:text-red-400 hover:bg-gray-800 transition-all">
            <LogOut className="w-4 h-4" /> Logout
          </button>
        </div>
      </aside>

      {/* Mobile overlay */}
      {sidebarOpen && <div className="lg:hidden fixed inset-0 z-30 bg-black/60" onClick={() => setSidebarOpen(false)} />}

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Topbar */}
        <header className="h-14 bg-gray-900 border-b border-gray-800 flex items-center gap-4 px-4 sticky top-0 z-20">
          <button onClick={() => setSidebarOpen(true)} className="lg:hidden text-gray-400 hover:text-white">
            <Menu className="w-5 h-5" />
          </button>
          <h1 className="text-white font-semibold text-sm flex-1">{NAV_ITEMS.find(n => n.path === location.pathname)?.label || "Admin"}</h1>
          <Link to="/" className="text-gray-400 hover:text-white text-xs flex items-center gap-1">
            <Store className="w-3.5 h-3.5" /> Store
          </Link>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-auto bg-gray-950 p-4 sm:p-6">
          {children}
        </main>
      </div>
    </div>
  );
}

