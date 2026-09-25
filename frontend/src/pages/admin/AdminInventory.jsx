import { useState, useEffect } from "react";
import { apiClient } from "@/api/apiClient";
import AdminLayout from "@/components/admin/AdminLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Warehouse, Search, Pencil, Download, Loader2, AlertTriangle } from "lucide-react";
import { usePersistentToast } from "@/components/ui/PersistentToast";
import FallbackImage from "@/components/ui/FallbackImage";
import { getProductImageUrls } from "@/utils/imageUrls";

export default function AdminInventory() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");
  const [editing, setEditing] = useState(null);
  const [newStock, setNewStock] = useState("");
  const [saving, setSaving] = useState(false);
  const toast = usePersistentToast();

  useEffect(() => {
    apiClient.entities.Product.list("-created_date", 500).then(p => { setProducts(p); setLoading(false); });
  }, []);

  const filtered = products.filter(p => {
    const matchSearch = !search || p.name?.toLowerCase().includes(search.toLowerCase()) || p.sku?.toLowerCase().includes(search.toLowerCase()) || p.category?.toLowerCase().includes(search.toLowerCase());
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
    const rows = [["Product Name", "Category", "Brand", "SKU", "Stock", "Price (৳)", "Status"]];
    filtered.forEach(p => rows.push([
      `"${p.name || ""}"`, p.category || "", p.brand || "", p.sku || "",
      p.stock ?? 0, p.price ?? 0,
      p.stock === 0 ? "Out of Stock" : p.stock < 10 ? "Low Stock" : "In Stock"
    ]));
    const csv = rows.map(r => r.join(",")).join("\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = "inventory.csv"; a.click();
    URL.revokeObjectURL(url);
    toast("Inventory exported", "success");
  };

  const stockColor = (s) => s === 0 ? "text-red-400" : s < 10 ? "text-yellow-400" : "text-green-400";
  const stockLabel = (s) => s === 0 ? "Out of Stock" : s < 10 ? "Low Stock" : "In Stock";

  const outCount = products.filter(p => p.stock === 0).length;
  const lowCount = products.filter(p => p.stock > 0 && p.stock < 10).length;

  return (
    <AdminLayout>
      <div className="space-y-5">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h2 className="text-white font-poppins font-bold text-xl flex items-center gap-2">
              <Warehouse className="w-5 h-5 text-primary" /> Inventory
            </h2>
            <p className="text-gray-400 text-sm">{products.length} products • {outCount} out of stock • {lowCount} low stock</p>
          </div>
          <Button onClick={exportCSV} variant="outline" className="border-gray-700 text-gray-300 hover:text-white gap-2">
            <Download className="w-4 h-4" /> Export CSV
          </Button>
        </div>

        {/* Summary cards */}
        <div className="grid grid-cols-3 gap-4">
          {[
            { label: "Total Products", value: products.length, color: "text-white" },
            { label: "Low Stock (<10)", value: lowCount, color: "text-yellow-400" },
            { label: "Out of Stock", value: outCount, color: "text-red-400" },
          ].map(({ label, value, color }) => (
            <div key={label} className="bg-gray-900 border border-gray-800 rounded-xl p-4 text-center">
              <div className={`font-poppins font-bold text-2xl ${color}`}>{value}</div>
              <div className="text-gray-400 text-xs mt-1">{label}</div>
            </div>
          ))}
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-500" />
            <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by name, SKU, category..."
              className="pl-9 bg-gray-800 border-gray-700 text-white placeholder:text-gray-500" />
          </div>
          <div className="flex gap-2">
            {[["all", "All"], ["low", "Low Stock"], ["out", "Out of Stock"]].map(([val, label]) => (
              <button key={val} onClick={() => setFilter(val)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${filter === val ? "bg-primary text-white" : "bg-gray-800 text-gray-400 hover:text-white"}`}>
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* Table */}
        <div className="bg-gray-900 rounded-2xl border border-gray-800 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr className="border-b border-gray-800">
                {["Product", "Category", "SKU", "Price", "Stock", "Status", "Action"].map(h => (
                  <th key={h} className="text-left px-4 py-3 text-gray-500 font-medium text-xs uppercase">{h}</th>
                ))}
              </tr></thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={7} className="text-center py-12"><Loader2 className="w-6 h-6 animate-spin text-primary mx-auto" /></td></tr>
                ) : filtered.length === 0 ? (
                  <tr><td colSpan={7} className="text-center py-12 text-gray-500">No products found</td></tr>
                ) : filtered.map(p => (
                  <tr key={p.id} className="border-b border-gray-800/50 hover:bg-gray-800/30">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 bg-gray-800 rounded-lg overflow-hidden flex-shrink-0">
                          <FallbackImage sources={getProductImageUrls(p)} alt="" className="w-full h-full object-cover" fallback={<Warehouse className="w-4 h-4 m-2.5 text-gray-600" />} />
                        </div>
                        <span className="text-white font-medium line-clamp-1 max-w-[150px]">{p.name}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-gray-400">{p.category || "—"}</td>
                    <td className="px-4 py-3 text-gray-400 font-mono text-xs">{p.sku || "—"}</td>
                    <td className="px-4 py-3 text-white font-semibold">৳{p.price?.toLocaleString()}</td>
                    <td className="px-4 py-3 font-bold text-lg">
                      <span className={stockColor(p.stock ?? 0)}>{p.stock ?? 0}</span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-xs font-semibold flex items-center gap-1 ${stockColor(p.stock ?? 0)}`}>
                        {(p.stock ?? 0) < 10 && <AlertTriangle className="w-3 h-3" />}
                        {stockLabel(p.stock ?? 0)}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <button onClick={() => { setEditing(p); setNewStock(String(p.stock ?? 0)); }}
                        className="p-1.5 text-gray-400 hover:text-primary hover:bg-gray-800 rounded-lg transition-colors">
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
        <DialogContent className="max-w-sm bg-gray-900 border-gray-800 text-white">
          <DialogHeader><DialogTitle className="text-white font-poppins">Update Stock</DialogTitle></DialogHeader>
          {editing && (
            <div className="space-y-4">
              <div className="bg-gray-800 rounded-xl p-3">
                <p className="text-white font-semibold">{editing.name}</p>
                <p className="text-gray-400 text-xs mt-0.5">Current stock: <span className={`font-bold ${stockColor(editing.stock ?? 0)}`}>{editing.stock ?? 0}</span></p>
              </div>
              <div>
                <label className="text-gray-300 text-sm mb-1 block">New Stock Quantity</label>
                <Input type="number" min="0" value={newStock} onChange={e => setNewStock(e.target.value)}
                  className="bg-gray-800 border-gray-700 text-white" autoFocus />
              </div>
              <div className="flex gap-3">
                <Button variant="outline" onClick={() => setEditing(null)} className="flex-1 border-gray-700 text-gray-300">Cancel</Button>
                <Button onClick={handleSaveStock} disabled={saving} className="flex-1 bg-primary hover:bg-primary/90">
                  {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null} Save
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}

