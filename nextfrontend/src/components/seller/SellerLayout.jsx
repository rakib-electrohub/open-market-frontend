import { useState, useEffect, useRef } from "react";
import { Link, useLocation } from "@/lib/next-router";
import {
  LayoutDashboard, Package, Warehouse, MessageCircle,
  Store, Menu, LogOut, ChevronRight, X
} from "lucide-react";
import { apiClient } from "@/api/apiClient";

// Module-level cache — persists across navigations, clears on full page reload
let _cachedSeller = null;

export function updateSellerCache(seller) {
  _cachedSeller = seller;
}

const NAV_ITEMS = [
  { icon: LayoutDashboard, label: "Dashboard", path: "/seller/dashboard" },
  { icon: Package, label: "Products", path: "/seller/products" },
  { icon: Warehouse, label: "Inventory", path: "/seller/inventory" },
  { icon: MessageCircle, label: "Chats", path: "/seller/chats" },
];

export default function SellerLayout({ children, mainClassName = "p-4 sm:p-6 overflow-auto" }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [seller, setSeller] = useState(_cachedSeller);
  const initialized = useRef(false);
  const location = useLocation();

  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;
    if (_cachedSeller !== null) return;

    apiClient.auth.me().then(async (u) => {
      const sellers = await apiClient.entities.Seller.filter({ user_id: u.id });
      if (sellers.length) {
        _cachedSeller = sellers[0];
        setSeller(sellers[0]);
      }
    }).catch(() => {});
  }, []);

  // Real-time seller updates (e.g. logo change from dashboard)
  useEffect(() => {
    const unsub = apiClient.entities.Seller.subscribe((event) => {
      if (event.type === "update" && _cachedSeller && event.id === _cachedSeller.id) {
        _cachedSeller = event.data;
        setSeller(event.data);
      }
    });
    return unsub;
  }, []);

  const currentLabel = NAV_ITEMS.find(n => n.path === location.pathname)?.label || "Seller";

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Sidebar */}
      <aside className={`fixed lg:sticky top-0 z-40 h-screen w-60 bg-white border-r border-border flex flex-col transition-transform duration-300 shadow-sm ${sidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}`}>
        {/* Store Header */}
        <div className="p-4 border-b border-border">
          <Link to="/" className="flex items-center gap-2.5 group">
            <div className="w-9 h-9 bg-primary rounded-xl flex items-center justify-center overflow-hidden flex-shrink-0 shadow-sm">
              {seller?.logo
                ? <img src={seller.logo} alt="" className="w-full h-full object-cover" />
                : <span className="text-white font-poppins font-black text-xs">OM</span>}
            </div>
            <div className="min-w-0">
              <div className="font-poppins font-bold text-sm text-foreground truncate leading-tight">
                {seller?.store_name || "My Store"}
              </div>
              <div className="text-[10px] text-primary font-semibold uppercase tracking-widest">Seller Panel</div>
            </div>
          </Link>
        </div>

        {/* Nav */}
        <nav className="flex-1 p-3 space-y-0.5 overflow-y-auto">
          {NAV_ITEMS.map(({ icon: NavIcon, label, path }) => {
            const active = location.pathname === path;
            return (
              <Link key={path} to={path} onClick={() => setSidebarOpen(false)}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150 group ${active
                  ? "bg-primary text-white shadow-sm"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted"
                }`}>
                <NavIcon className={`w-4 h-4 flex-shrink-0 ${active ? "text-white" : "text-muted-foreground group-hover:text-foreground"}`} />
                {label}
                {active && <ChevronRight className="w-3.5 h-3.5 ml-auto" />}
              </Link>
            );
          })}
        </nav>

        {/* Bottom */}
        <div className="p-3 border-t border-border space-y-0.5">
          <Link to="/" className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-muted-foreground hover:text-foreground hover:bg-muted transition-all">
            <Store className="w-4 h-4" /> View Store
          </Link>
          <button onClick={() => apiClient.auth.logout()} className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-muted-foreground hover:text-red-500 hover:bg-red-50 transition-all">
            <LogOut className="w-4 h-4" /> Logout
          </button>
        </div>
      </aside>

      {/* Mobile overlay */}
      {sidebarOpen && (
        <div className="lg:hidden fixed inset-0 z-30 bg-black/50" onClick={() => setSidebarOpen(false)} />
      )}

      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0 min-h-screen">
        {/* Topbar */}
        <header className="h-14 bg-white border-b border-border flex items-center gap-4 px-4 sticky top-0 z-20 shadow-sm">
          <button onClick={() => setSidebarOpen(true)} className="lg:hidden text-muted-foreground hover:text-foreground p-1">
            {sidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
          <h1 className="text-foreground font-semibold text-sm flex-1">{currentLabel}</h1>
          <Link to="/" className="text-muted-foreground hover:text-primary text-xs flex items-center gap-1.5 transition-colors">
            <Store className="w-3.5 h-3.5" /> Store
          </Link>
        </header>

        <main className={`flex-1 ${mainClassName}`}>
          {children}
        </main>
      </div>
    </div>
  );
}

