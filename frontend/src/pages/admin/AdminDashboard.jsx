import { useState, useEffect } from "react";
import { apiClient } from "@/api/apiClient";
import AdminLayout from "@/components/admin/AdminLayout";
import { ShoppingBag, Package, Users, DollarSign, AlertTriangle } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { Link } from "react-router-dom";
import FallbackImage from "@/components/ui/FallbackImage";
import { getProductImageUrls } from "@/utils/imageUrls";

export default function AdminDashboard() {
  const [orders, setOrders] = useState([]);
  const [products, setProducts] = useState([]);
  const [sellers, setSellers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      apiClient.entities.Order.list("-created_date", 100),
      apiClient.entities.Product.list("-created_date", 100),
      apiClient.entities.Seller.list("-created_date", 50),
    ]).then(([o, p, s]) => {
      setOrders(o);
      setProducts(p);
      setSellers(s);
      setLoading(false);
    });
  }, []);

  const totalRevenue = orders.filter(o => o.status !== "cancelled" && o.status !== "refunded").reduce((s, o) => s + (o.total || 0), 0);
  const pendingOrders = orders.filter(o => o.status === "pending").length;
  const deliveredOrders = orders.filter(o => o.status === "delivered").length;
  const pendingSellers = sellers.filter(s => s.status === "pending").length;

  // Build last 7 days revenue chart
  const last7 = Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (6 - i));
    const dayStr = d.toLocaleDateString("en-BD", { weekday: "short" });
    const dayOrders = orders.filter(o => {
      const od = new Date(o.created_date);
      return od.toDateString() === d.toDateString() && o.status !== "cancelled";
    });
    return { day: dayStr, revenue: dayOrders.reduce((s, o) => s + (o.total || 0), 0), orders: dayOrders.length };
  });

  const statusData = [
    { name: "Pending", value: orders.filter(o => o.status === "pending").length, color: "#f59e0b" },
    { name: "Processing", value: orders.filter(o => o.status === "processing").length, color: "#3b82f6" },
    { name: "Shipped", value: orders.filter(o => o.status === "shipped").length, color: "#8b5cf6" },
    { name: "Delivered", value: orders.filter(o => o.status === "delivered").length, color: "#10b981" },
    { name: "Cancelled", value: orders.filter(o => o.status === "cancelled").length, color: "#ef4444" },
  ];

  const KpiCard = ({ icon: Icon, label, value, sub, color }) => (
    <div className="bg-gray-900 rounded-2xl border border-gray-800 p-5">
      <div className="flex justify-between items-start mb-3">
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${color}`}>
          <Icon className="w-5 h-5 text-white" />
        </div>
      </div>
      <div className="font-poppins font-black text-2xl text-white mb-1">{value}</div>
      <div className="text-gray-400 text-xs font-medium">{label}</div>
      {sub && <div className="text-gray-500 text-xs mt-1">{sub}</div>}
    </div>
  );

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* KPI Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <KpiCard icon={DollarSign} label="Total Revenue" value={`৳${(totalRevenue/1000).toFixed(1)}K`} sub={`${orders.length} total orders`} color="bg-primary" />
          <KpiCard icon={ShoppingBag} label="Orders Today" value={orders.filter(o => new Date(o.created_date).toDateString() === new Date().toDateString()).length} sub={`${pendingOrders} pending`} color="bg-orange-500" />
          <KpiCard icon={Package} label="Total Products" value={products.length} sub={`${products.filter(p => p.stock === 0).length} out of stock`} color="bg-blue-500" />
          <KpiCard icon={Users} label="Sellers" value={sellers.length} sub={pendingSellers > 0 ? `${pendingSellers} awaiting approval` : "All approved"} color="bg-purple-500" />
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Revenue Chart */}
          <div className="lg:col-span-2 bg-gray-900 rounded-2xl border border-gray-800 p-5">
            <h3 className="text-white font-semibold mb-4">Revenue (Last 7 Days)</h3>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={last7}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
                <XAxis dataKey="day" tick={{ fill: "#6b7280", fontSize: 12 }} />
                <YAxis tick={{ fill: "#6b7280", fontSize: 12 }} />
                <Tooltip contentStyle={{ backgroundColor: "#111827", border: "1px solid #374151", color: "#f9fafb" }} formatter={(v) => [`৳${v.toLocaleString()}`, "Revenue"]} />
                <Bar dataKey="revenue" fill="#e8272b" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Order status */}
          <div className="bg-gray-900 rounded-2xl border border-gray-800 p-5">
            <h3 className="text-white font-semibold mb-4">Orders by Status</h3>
            <div className="space-y-3">
              {statusData.map(s => (
                <div key={s.name} className="flex items-center gap-3">
                  <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: s.color }} />
                  <div className="flex-1">
                    <div className="flex justify-between text-xs mb-1"><span className="text-gray-400">{s.name}</span><span className="text-white font-semibold">{s.value}</span></div>
                    <div className="h-1.5 bg-gray-800 rounded-full overflow-hidden">
                      <div className="h-full rounded-full transition-all" style={{ width: orders.length ? `${(s.value / orders.length) * 100}%` : "0%", backgroundColor: s.color }} />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Low Stock Alert */}
        {products.filter(p => p.stock !== undefined && p.stock <= 5 && p.stock >= 0).length > 0 && (
          <div className="bg-orange-950/40 border border-orange-800/60 rounded-2xl p-5">
            <div className="flex items-center gap-2 mb-3">
              <AlertTriangle className="w-5 h-5 text-orange-400" />
              <h3 className="text-orange-300 font-semibold">Low Stock Alert</h3>
              <span className="ml-auto text-xs text-orange-400">{products.filter(p => p.stock !== undefined && p.stock <= 5).length} items need attention</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
              {products.filter(p => p.stock !== undefined && p.stock <= 5).slice(0, 6).map(p => (
                <div key={p.id} className="flex items-center gap-3 bg-gray-900/60 rounded-xl p-3">
                  <div className="w-9 h-9 bg-gray-800 rounded-lg overflow-hidden flex-shrink-0">
                    <FallbackImage sources={getProductImageUrls(p)} alt="" className="w-full h-full object-cover" fallback={<Package className="w-4 h-4 m-2.5 text-gray-600" />} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-white text-xs font-medium truncate">{p.name}</p>
                    <p className={`text-xs font-bold ${p.stock === 0 ? "text-red-400" : "text-orange-400"}`}>
                      {p.stock === 0 ? "Out of stock" : `${p.stock} left`}
                    </p>
                  </div>
                </div>
              ))}
            </div>
            <Link to="/admin/products" className="inline-block mt-3 text-xs text-orange-400 hover:text-orange-300 hover:underline">Manage all products →</Link>
          </div>
        )}

        {/* Recent Orders */}
        <div className="bg-gray-900 rounded-2xl border border-gray-800 overflow-hidden">
          <div className="p-5 border-b border-gray-800 flex justify-between items-center">
            <h3 className="text-white font-semibold">Recent Orders</h3>
            <a href="/admin/orders" className="text-primary text-sm hover:underline">View All →</a>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr className="border-b border-gray-800">
                {["Order #", "Customer", "Items", "Total", "Payment", "Status", "Date"].map(h => (
                  <th key={h} className="text-left px-4 py-3 text-gray-500 font-medium text-xs uppercase">{h}</th>
                ))}
              </tr></thead>
              <tbody>
                {orders.slice(0, 8).map(order => (
                  <tr key={order.id} className="border-b border-gray-800/50 hover:bg-gray-800/30 transition-colors">
                    <td className="px-4 py-3 text-primary font-mono font-semibold text-xs">{order.order_number}</td>
                    <td className="px-4 py-3 text-white font-medium">{order.customer_name}</td>
                    <td className="px-4 py-3 text-gray-400">{order.items?.length || 0} items</td>
                    <td className="px-4 py-3 text-white font-semibold">৳{order.total?.toLocaleString()}</td>
                    <td className="px-4 py-3 text-gray-400 uppercase text-xs">{order.payment_method}</td>
                    <td className="px-4 py-3">
                      <span className={`text-xs font-semibold px-2 py-0.5 rounded-full capitalize ${
                        order.status === "delivered" ? "bg-green-900/50 text-green-400" :
                        order.status === "pending" ? "bg-yellow-900/50 text-yellow-400" :
                        order.status === "shipped" ? "bg-purple-900/50 text-purple-400" :
                        order.status === "cancelled" ? "bg-red-900/50 text-red-400" :
                        "bg-blue-900/50 text-blue-400"}`}>
                        {order.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-400 text-xs">{new Date(order.created_date).toLocaleDateString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}

