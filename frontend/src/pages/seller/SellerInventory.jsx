import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { apiClient } from "@/api/apiClient";
import SellerLayout from "@/components/seller/SellerLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Warehouse, Search, Pencil, Download, Loader2, AlertTriangle, ArrowLeft } from "lucide-react";
import { usePersistentToast } from "@/components/ui/PersistentToast";
import FallbackImage from "@/components/ui/FallbackImage";
import { getProductImageUrls } from "@/utils/imageUrls";

export default function SellerInventory() {
  const [seller, setSeller] = useState(null);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");
  const [editing, setEditing] = useState(null);
  const [newStock, setNewStock] = useState("");
  const [saving, setSaving] = useState(false);
  const toast = usePersistentToast();
  const navigate = useNavigate();

  useEffect(() => {
    apiClient.auth.me()
      .then(async (user) => {
        const sellers = await apiClient.entities.Seller.filter({ user_id: user.id });
        if (!sellers.length || sellers[0].status !== "approved") { navigate("/seller/dashboard"); return; }
        setSeller(sellers[0]);
        const prods = await apiClient.entities.Product.filter({ seller_id: sellers[0].id }, "-created_date", 500);
        setProducts(prods);
        setLoading(false);
      })
      .catch(() => apiClient.auth.redirectToLogin("/seller/inventory"));
  }, []);

  const filtered = products.filter(p => {
    const matchSearch = !search || p.name?.toLowerCase().includes(search.toLowerCase()) || p.sku?.toLowerCase().includes(search.toLowerCase());
    const matchFilter = filter === "all" || (filter === "out" && p.stock === 0) || (filter === "low" && p.stock > 0 && p.stock < 10);
    return matchSearch && matchFilter;
  });

  const handleSaveStock = async () => {
    if (newStock === "" || isNaN(parseInt(newStock))) { toast("Enter a valid stock number", "error"); return; }
    setSaving(true);
    const updated = await apiClient.entities.Product.update(editing.id, { stock: parseInt(newStock) });
    setProducts(products.map(p => p.id === editing.id ? updated : p));
    setSaving(false);
    setEditing(null);
    toast("Stock updated for " + editing.name, "success");
  };

  const exportCSV = () => {
    const rows = [["Product Name", "SKU", "Stock", "Price (৳)", "Status"]];
    filtered.forEach(p => rows.push([
      `"${p.name || ""}"`, p.sku || "", p.stock ?? 0, p.price ?? 0,
      p.stock === 0 ? "Out of Stock" : p.stock < 10 ? "Low Stock" : "In Stock"
    ]));
    const csv = rows.map(r => r.join(",")).join("\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = "my-inventory.csv"; a.click();
    URL.revokeObjectURL(url);
    toast("Inventory exported", "success");
  };

  const stockColor = (s) => s === 0 ? "text-red-600" : s < 10 ? "text-yellow-600" : "text-green-600";
  const stockBg = (s) => s === 0 ? "bg-red-50 text-red-600" : s < 10 ? "bg-yellow-50 text-yellow-700" : "bg-green-50 text-green-700";
  const stockLabel = (s) => s === 0 ? "Out of Stock" : s < 10 ? "Low Stock" : "In Stock";

  const outCount = products.filter(p => p.stock === 0).length;
  const lowCount = products.filter(p => p.stock > 0 && p.stock < 10).length;

  if (loading) return (
    <SellerLayout>
      <div className="flex items-center justify-center h-64"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>
    </SellerLayout>
  );

  return (
    <SellerLayout>
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-4 mb-6 flex-wrap">
          <Link to="/seller/dashboard" className="p-2 hover:bg-muted rounded-lg transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div className="flex-1">
            <h1 className="font-poppins font-bold text-xl flex items-center gap-2">
              <Warehouse className="w-5 h-5 text-primary" /> My Inventory
            </h1>
            <p className="text-muted-foreground text-sm">{products.length} products • {seller?.store_name}</p>
          </div>
          <Button onClick={exportCSV} variant="outline" className="gap-2">
            <Download className="w-4 h-4" /> Export CSV
          </Button>
        </div>

        {/* Summary cards */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          {[
            { label: "Total Products", value: products.length, color: "text-foreground" },
            { label: "Low Stock", value: lowCount, color: "text-yellow-600" },
            { label: "Out of Stock", value: outCount, color: "text-red-600" },
          ].map(({ label, value, color }) => (
            <div key={label} className="bg-white border border-border rounded-xl p-4 text-center">
              <div className={`font-poppins font-bold text-2xl ${color}`}>{value}</div>
              <div className="text-muted-foreground text-xs mt-1">{label}</div>
            </div>
          ))}
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3 mb-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-2.5 w-4 h-4 text-muted-foreground" />
            <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search products or SKU..."
              className="pl-9" />
          </div>
          <div className="flex gap-2">
            {[["all", "All"], ["low", "Low Stock"], ["out", "Out of Stock"]].map(([val, label]) => (
              <button key={val} onClick={() => setFilter(val)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${filter === val ? "bg-primary text-white" : "bg-muted text-muted-foreground hover:text-foreground"}`}>
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* Table */}
        <div className="bg-white rounded-xl border border-border overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/30 border-b border-border">
                <tr>
                  {["Product", "SKU", "Price", "Stock", "Status", "Action"].map(h => (
                    <th key={h} className="text-left px-4 py-3 text-muted-foreground font-medium text-xs uppercase">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filtered.length === 0 ? (
                  <tr><td colSpan={6} className="text-center py-12 text-muted-foreground">No products found</td></tr>
                ) : filtered.map(p => (
                  <tr key={p.id} className="hover:bg-muted/20 transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 bg-gray-100 rounded-lg overflow-hidden flex-shrink-0">
                          <FallbackImage sources={getProductImageUrls(p)} alt="" className="w-full h-full object-cover" fallback={<Warehouse className="w-4 h-4 m-2.5 text-gray-400" />} />
                        </div>
                        <span className="font-medium line-clamp-1 max-w-[160px]">{p.name}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground font-mono text-xs">{p.sku || "—"}</td>
                    <td className="px-4 py-3 font-semibold">৳{p.price?.toLocaleString()}</td>
                    <td className="px-4 py-3">
                      <span className={`font-bold text-lg ${stockColor(p.stock ?? 0)}`}>{p.stock ?? 0}</span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-xs font-semibold px-2 py-0.5 rounded-full inline-flex items-center gap-1 ${stockBg(p.stock ?? 0)}`}>
                        {(p.stock ?? 0) < 10 && <AlertTriangle className="w-3 h-3" />}
                        {stockLabel(p.stock ?? 0)}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <button onClick={() => { setEditing(p); setNewStock(String(p.stock ?? 0)); }}
                        className="p-1.5 hover:bg-primary/10 hover:text-primary rounded-lg transition-colors">
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <Dialog open={!!editing} onOpenChange={() => setEditing(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle className="font-poppins">Update Stock</DialogTitle></DialogHeader>
          {editing && (
            <div className="space-y-4">
              <div className="bg-muted rounded-xl p-3">
                <p className="font-semibold">{editing.name}</p>
                <p className="text-muted-foreground text-xs mt-0.5">Current: <span className={`font-bold ${stockColor(editing.stock ?? 0)}`}>{editing.stock ?? 0} units</span></p>
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">New Stock Quantity</label>
                <Input type="number" min="0" value={newStock} onChange={e => setNewStock(e.target.value)} autoFocus />
              </div>
              <div className="flex gap-3">
                <Button variant="outline" onClick={() => setEditing(null)} className="flex-1">Cancel</Button>
                <Button onClick={handleSaveStock} disabled={saving} className="flex-1 bg-primary hover:bg-primary/90">
                  {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null} Update
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </SellerLayout>
  );
}

