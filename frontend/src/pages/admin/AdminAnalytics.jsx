import { useState, useEffect } from "react";
import { apiClient } from "@/api/apiClient";
import AdminLayout from "@/components/admin/AdminLayout";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell } from "recharts";
import { TrendingUp, ShoppingBag, Package, DollarSign } from "lucide-react";

const COLORS = ["#e8272b", "#f59e0b", "#3b82f6", "#10b981", "#8b5cf6"];

export default function AdminAnalytics() {
  const [orders, setOrders] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      apiClient.entities.Order.list("-created_date", 500),
      apiClient.entities.Product.list("-sold_count", 100),
    ]).then(([o, p]) => { setOrders(o); setProducts(p); setLoading(false); });
  }, []);

  const completedOrders = orders.filter(o => o.status !== "cancelled" && o.status !== "refunded");
  const totalRevenue = completedOrders.reduce((s, o) => s + (o.total || 0), 0);
  const avgOrderValue = completedOrders.length ? totalRevenue / completedOrders.length : 0;

  // Monthly revenue last 6 months
  const monthly = Array.from({ length: 6 }, (_, i) => {
    const d = new Date();
    d.setMonth(d.getMonth() - (5 - i));
    const month = d.toLocaleDateString("en-BD", { month: "short" });
    const monthOrders = completedOrders.filter(o => {
      const od = new Date(o.created_date);
      return od.getMonth() === d.getMonth() && od.getFullYear() === d.getFullYear();
    });
    return { month, revenue: monthOrders.reduce((s, o) => s + (o.total || 0), 0), orders: monthOrders.length };
  });

  // Category distribution
  const categoryMap = {};
  orders.forEach(o => o.items?.forEach(item => {
    const prod = products.find(p => p.id === item.product_id);
    if (prod?.category) categoryMap[prod.category] = (categoryMap[prod.category] || 0) + (item.price * item.quantity);
  }));
  const categoryData = Object.entries(categoryMap).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([name, value]) => ({ name, value }));

  // Top products
  const topProducts = [...products].sort((a, b) => (b.sold_count || 0) - (a.sold_count || 0)).slice(0, 5);

  // Payment method breakdown
  const paymentData = ["cod", "bkash", "nagad", "rocket", "card"].map(m => ({
    name: m.toUpperCase(),
    value: orders.filter(o => o.payment_method === m).length
  })).filter(p => p.value > 0);

  if (loading) return <AdminLayout><div className="flex justify-center py-20"><div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" /></div></AdminLayout>;

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <h2 className="text-white font-poppins font-bold text-xl">Analytics & Reports</h2>
          <p className="text-gray-400 text-sm">Store performance overview</p>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { icon: DollarSign, label: "Total Revenue", value: `৳${(totalRevenue/1000).toFixed(1)}K`, color: "bg-primary" },
            { icon: ShoppingBag, label: "Total Orders", value: orders.length, color: "bg-orange-500" },
            { icon: TrendingUp, label: "Avg Order Value", value: `৳${Math.round(avgOrderValue).toLocaleString()}`, color: "bg-blue-500" },
            { icon: Package, label: "Products Sold", value: completedOrders.reduce((s, o) => s + (o.items?.reduce((si, i) => si + i.quantity, 0) || 0), 0), color: "bg-purple-500" },
          ].map(({ icon: Icon, label, value, color }) => (
            <div key={label} className="bg-gray-900 rounded-2xl border border-gray-800 p-5">
              <div className={`w-9 h-9 rounded-xl ${color} flex items-center justify-center mb-3`}>
                <Icon className="w-4 h-4 text-white" />
              </div>
              <div className="font-poppins font-black text-2xl text-white">{value}</div>
              <div className="text-gray-400 text-xs mt-1">{label}</div>
            </div>
          ))}
        </div>

        {/* Revenue Chart */}
        <div className="bg-gray-900 rounded-2xl border border-gray-800 p-5">
          <h3 className="text-white font-semibold mb-4">Monthly Revenue & Orders</h3>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={monthly}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
              <XAxis dataKey="month" tick={{ fill: "#6b7280", fontSize: 12 }} />
              <YAxis yAxisId="left" tick={{ fill: "#6b7280", fontSize: 12 }} />
              <YAxis yAxisId="right" orientation="right" tick={{ fill: "#6b7280", fontSize: 12 }} />
              <Tooltip contentStyle={{ backgroundColor: "#111827", border: "1px solid #374151", color: "#f9fafb" }} />
              <Bar yAxisId="left" dataKey="revenue" fill="#e8272b" radius={[4, 4, 0, 0]} name="Revenue (৳)" />
              <Line yAxisId="right" type="monotone" dataKey="orders" stroke="#f59e0b" strokeWidth={2} dot={{ fill: "#f59e0b" }} name="Orders" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Top Products */}
          <div className="lg:col-span-2 bg-gray-900 rounded-2xl border border-gray-800 p-5">
            <h3 className="text-white font-semibold mb-4">Top Selling Products</h3>
            <div className="space-y-3">
              {topProducts.map((p, i) => (
                <div key={p.id} className="flex items-center gap-3">
                  <span className="text-gray-500 font-mono text-sm w-5">{i + 1}</span>
                  <div className="w-8 h-8 bg-gray-800 rounded-lg overflow-hidden flex-shrink-0">
                    {p.images?.[0] && <img src={p.images[0]} alt="" className="w-full h-full object-cover" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-white text-sm font-medium line-clamp-1">{p.name}</p>
                    <div className="h-1.5 bg-gray-800 rounded-full mt-1 overflow-hidden">
                      <div className="h-full bg-primary rounded-full" style={{ width: topProducts[0].sold_count ? `${((p.sold_count || 0) / topProducts[0].sold_count) * 100}%` : "0%" }} />
                    </div>
                  </div>
                  <span className="text-gray-400 text-sm">{p.sold_count || 0} sold</span>
                </div>
              ))}
              {topProducts.length === 0 && <p className="text-gray-500 text-sm">No sales data yet</p>}
            </div>
          </div>

          {/* Payment methods */}
          <div className="bg-gray-900 rounded-2xl border border-gray-800 p-5">
            <h3 className="text-white font-semibold mb-4">Payment Methods</h3>
            {paymentData.length > 0 ? (
              <>
                <ResponsiveContainer width="100%" height={140}>
                  <PieChart>
                    <Pie data={paymentData} cx="50%" cy="50%" innerRadius={40} outerRadius={65} dataKey="value">
                      {paymentData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                    </Pie>
                    <Tooltip contentStyle={{ backgroundColor: "#111827", border: "1px solid #374151", color: "#f9fafb" }} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="space-y-2 mt-2">
                  {paymentData.map((d, i) => (
                    <div key={d.name} className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2"><div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] }} /><span className="text-gray-300">{d.name}</span></div>
                      <span className="text-white font-semibold">{d.value}</span>
                    </div>
                  ))}
                </div>
              </>
            ) : <p className="text-gray-500 text-sm">No data yet</p>}
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}

