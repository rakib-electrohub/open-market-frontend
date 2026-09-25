import { useState, useEffect } from "react";
import { apiClient } from "@/api/apiClient";
import AdminLayout from "@/components/admin/AdminLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Zap, Search, Pencil, Trash2, Plus, Loader2, Clock, Check, X } from "lucide-react";
import { usePersistentToast } from "@/components/ui/PersistentToast";
import FlashSaleTimer from "@/components/store/FlashSaleTimer";

export default function AdminFlashSales() {
  const [flashRequests, setFlashRequests] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ flash_sale_price: "", flash_sale_start: "", flash_sale_end: "" });
  const [saving, setSaving] = useState(false);
  const toast = usePersistentToast();

  useEffect(() => {
    apiClient.entities.FlashSaleRequest.filter({ status: "pending" }, "-created_date").then(setFlashRequests).catch(() => {});
    apiClient.entities.Product.filter({ is_active: true, approval_status: "approved" }, "-created_date", 200)
      .then(p => { setProducts(p); setLoading(false); });
  }, []);

  const flashProducts = products.filter(p => p.flash_sale_price && p.flash_sale_end);
  const activeFlash = flashProducts.filter(p => new Date(p.flash_sale_end) > new Date());
  const otherProducts = products.filter(p => !p.flash_sale_price);
  const filtered = otherProducts.filter(p => p.name?.toLowerCase().includes(search.toLowerCase()));

  const openSetFlash = (p) => {
    setEditing(p);
    const now = new Date();
    const end = new Date(now.getTime() + 24 * 60 * 60 * 1000);
    setForm({
      flash_sale_price: p.flash_sale_price || Math.round(p.price * 0.8),
      flash_sale_start: p.flash_sale_start || now.toISOString().slice(0, 16),
      flash_sale_end: p.flash_sale_end || end.toISOString().slice(0, 16),
    });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!form.flash_sale_price || !form.flash_sale_end) { toast("Fill all fields", "error"); return; }
    if (parseFloat(form.flash_sale_price) >= editing.price) { toast("Flash price must be less than original price", "error"); return; }
    setSaving(true);
    const updated = await apiClient.entities.Product.update(editing.id, {
      flash_sale_price: parseFloat(form.flash_sale_price),
      flash_sale_start: form.flash_sale_start,
      flash_sale_end: form.flash_sale_end,
    });
    setProducts(products.map(p => p.id === editing.id ? updated : p));
    setSaving(false);
    setDialogOpen(false);
    toast("Flash sale set: " + editing.name, "success");
  };

  const approveRequest = async (req) => {
    await apiClient.entities.Product.update(req.product_id, {
      flash_sale_price: req.requested_price,
      flash_sale_start: req.start_date,
      flash_sale_end: req.end_date,
    });
    await apiClient.entities.FlashSaleRequest.update(req.id, { status: "approved" });
    setFlashRequests(flashRequests.filter(r => r.id !== req.id));
    setProducts(await apiClient.entities.Product.filter({ is_active: true, approval_status: "approved" }, "-created_date", 200));
    toast("Flash sale approved: " + req.product_name, "success");
  };

  const rejectRequest = async (req) => {
    await apiClient.entities.FlashSaleRequest.update(req.id, { status: "rejected" });
    setFlashRequests(flashRequests.filter(r => r.id !== req.id));
    toast("Request rejected", "delete");
  };

  const removeFlash = async (product) => {
    if (!confirm("Remove flash sale from this product?")) return;
    const updated = await apiClient.entities.Product.update(product.id, { flash_sale_price: null, flash_sale_start: null, flash_sale_end: null });
    setProducts(products.map(p => p.id === product.id ? updated : p));
    toast("Flash sale removed", "delete");
  };

  return (
    <AdminLayout>
      <div className="space-y-5">
        <div>
          <h2 className="text-white font-poppins font-bold text-xl flex items-center gap-2">
            <Zap className="w-5 h-5 text-primary fill-primary" /> Flash Sales
          </h2>
          <p className="text-gray-400 text-sm">{activeFlash.length} active flash sales</p>
        </div>

        {/* Seller Flash Sale Requests */}
        {flashRequests.length > 0 && (
          <div>
            <h3 className="text-white font-semibold text-sm mb-3 uppercase tracking-wide flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-yellow-400 animate-pulse inline-block" />
              Pending Seller Requests ({flashRequests.length})
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {flashRequests.map(req => {
                const discount = Math.round(((req.original_price - req.requested_price) / req.original_price) * 100);
                return (
                  <div key={req.id} className="bg-gray-900 rounded-2xl border border-yellow-500/30 p-4">
                    <div className="flex items-start gap-3 mb-3">
                      <div className="w-12 h-12 bg-gray-800 rounded-xl overflow-hidden flex-shrink-0">
                        {req.product_image ? <img src={req.product_image} alt="" className="w-full h-full object-cover" /> : <Zap className="w-6 h-6 m-3 text-gray-600" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-white font-semibold text-sm line-clamp-1">{req.product_name}</p>
                        <p className="text-gray-400 text-xs">{req.seller_name}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-primary font-bold">৳{req.requested_price?.toLocaleString()}</span>
                          <span className="text-gray-500 text-xs line-through">৳{req.original_price?.toLocaleString()}</span>
                          <span className="text-xs bg-primary/20 text-primary px-1.5 rounded-full">-{discount}%</span>
                        </div>
                      </div>
                    </div>
                    <p className="text-gray-500 text-xs mb-3">Ends: {req.end_date ? new Date(req.end_date).toLocaleString() : "—"}</p>
                    <div className="flex gap-2">
                      <Button size="sm" onClick={() => approveRequest(req)} className="flex-1 bg-green-600 hover:bg-green-700 text-white text-xs">
                        <Check className="w-3 h-3 mr-1" /> Approve
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => rejectRequest(req)} className="border-red-900 text-red-400 hover:bg-red-900/30 text-xs">
                        <X className="w-3 h-3" />
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Active Flash Sales */}
        {activeFlash.length > 0 && (
          <div>
            <h3 className="text-white font-semibold text-sm mb-3 uppercase tracking-wide">Active Flash Sales</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {activeFlash.map(p => {
                const discount = Math.round(((p.price - p.flash_sale_price) / p.price) * 100);
                return (
                  <div key={p.id} className="bg-gray-900 rounded-2xl border border-primary/30 p-4 relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-20 h-20 bg-primary/5 rounded-full -translate-y-4 translate-x-4" />
                    <div className="flex items-start gap-3 mb-3">
                      <div className="w-12 h-12 bg-gray-800 rounded-xl overflow-hidden flex-shrink-0">
                        {p.images?.[0] ? <img src={p.images[0]} alt="" className="w-full h-full object-cover" /> : <Zap className="w-6 h-6 m-3 text-gray-600" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-white font-semibold text-sm line-clamp-1">{p.name}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-primary font-poppins font-bold">৳{p.flash_sale_price?.toLocaleString()}</span>
                          <span className="text-gray-500 text-xs line-through">৳{p.price?.toLocaleString()}</span>
                          <Badge className="bg-primary text-white text-[10px] px-1.5">-{discount}%</Badge>
                        </div>
                      </div>
                    </div>
                    <div className="bg-gray-800 rounded-xl p-2 mb-3">
                      <FlashSaleTimer endTime={p.flash_sale_end} label="Ends in" />
                    </div>
                    <div className="flex gap-2">
                      <Button size="sm" variant="outline" onClick={() => openSetFlash(p)} className="flex-1 border-gray-700 text-gray-300 hover:text-white text-xs">
                        <Pencil className="w-3 h-3 mr-1" /> Edit
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => removeFlash(p)} className="border-red-900 text-red-400 hover:bg-red-900/30 text-xs">
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Add Flash Sale to Product */}
        <div>
          <h3 className="text-white font-semibold text-sm mb-3 uppercase tracking-wide">Set Flash Sale on Product</h3>
          <div className="relative mb-4">
            <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-500" />
            <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search products..." className="pl-9 bg-gray-800 border-gray-700 text-white placeholder:text-gray-500" />
          </div>

          <div className="bg-gray-900 rounded-2xl border border-gray-800 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead><tr className="border-b border-gray-800">
                  {["Product", "Original Price", "Suggested Flash", "Action"].map(h => (
                    <th key={h} className="text-left px-4 py-3 text-gray-500 font-medium text-xs uppercase">{h}</th>
                  ))}
                </tr></thead>
                <tbody>
                  {loading ? <tr><td colSpan={4} className="text-center py-8"><Loader2 className="w-5 h-5 animate-spin text-primary mx-auto" /></td></tr>
                    : filtered.slice(0, 20).map(p => (
                      <tr key={p.id} className="border-b border-gray-800/50 hover:bg-gray-800/30">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <div className="w-8 h-8 bg-gray-800 rounded overflow-hidden">{p.images?.[0] && <img src={p.images[0]} alt="" className="w-full h-full object-cover" />}</div>
                            <span className="text-white font-medium line-clamp-1">{p.name}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-white font-semibold">৳{p.price?.toLocaleString()}</td>
                        <td className="px-4 py-3 text-primary font-semibold">৳{Math.round(p.price * 0.8)?.toLocaleString()} <span className="text-gray-500 text-xs">(20% off)</span></td>
                        <td className="px-4 py-3">
                          <Button size="sm" onClick={() => openSetFlash(p)} className="bg-primary hover:bg-primary/90 text-xs">
                            <Zap className="w-3 h-3 mr-1" /> Set Flash Sale
                          </Button>
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      {/* Flash Sale Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md bg-gray-900 border-gray-800 text-white">
          <DialogHeader>
            <DialogTitle className="text-white font-poppins flex items-center gap-2">
              <Zap className="w-4 h-4 text-primary" /> Set Flash Sale — {editing?.name}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="bg-gray-800 rounded-xl p-3">
              <p className="text-gray-400 text-xs mb-1">Original Price</p>
              <p className="font-poppins font-bold text-xl">৳{editing?.price?.toLocaleString()}</p>
            </div>
            <div>
              <Label className="text-gray-300">Flash Sale Price (৳) *</Label>
              <Input type="number" value={form.flash_sale_price} onChange={e => setForm({ ...form, flash_sale_price: e.target.value })} className="mt-1 bg-gray-800 border-gray-700 text-white" />
              {form.flash_sale_price && editing && (
                <p className="text-primary text-xs mt-1">
                  Discount: {Math.round(((editing.price - parseFloat(form.flash_sale_price)) / editing.price) * 100)}% off
                </p>
              )}
            </div>
            <div>
              <Label className="text-gray-300">Start Time</Label>
              <Input type="datetime-local" value={form.flash_sale_start} onChange={e => setForm({ ...form, flash_sale_start: e.target.value })} className="mt-1 bg-gray-800 border-gray-700 text-white" />
            </div>
            <div>
              <Label className="text-gray-300">End Time *</Label>
              <Input type="datetime-local" value={form.flash_sale_end} onChange={e => setForm({ ...form, flash_sale_end: e.target.value })} className="mt-1 bg-gray-800 border-gray-700 text-white" />
            </div>
            <div className="flex gap-3">
              <Button variant="outline" onClick={() => setDialogOpen(false)} className="flex-1 border-gray-700 text-gray-300">Cancel</Button>
              <Button onClick={handleSave} disabled={saving} className="flex-1 bg-primary hover:bg-primary/90">
                {saving ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <Zap className="w-4 h-4 mr-1" />} Activate Flash Sale
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}

