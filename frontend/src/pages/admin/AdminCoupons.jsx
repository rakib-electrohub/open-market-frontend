import { useState, useEffect } from "react";
import { apiClient } from "@/api/apiClient";
import AdminLayout from "@/components/admin/AdminLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tag, Plus, Pencil, Trash2, Loader2, Copy } from "lucide-react";
import { usePersistentToast } from "@/components/ui/PersistentToast";

const EMPTY = { code: "", type: "percentage", value: "", min_order_value: "", max_uses: "", expiry_date: "", is_active: true, single_use_per_customer: false, description: "" };

export default function AdminCoupons() {
  const [coupons, setCoupons] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false);
  const notify = usePersistentToast();

  useEffect(() => { apiClient.entities.Coupon.list("-created_date").then(c => { setCoupons(c); setLoading(false); }); }, []);

  const openCreate = () => { setEditing(null); setForm(EMPTY); setDialogOpen(true); };
  const openEdit = (c) => { setEditing(c); setForm({ ...c, expiry_date: c.expiry_date ? c.expiry_date.slice(0, 10) : "" }); setDialogOpen(true); };

  const handleSave = async () => {
    if (!form.code || !form.value) { notify("Code and value required", "error"); return; }
    setSaving(true);
    const data = { ...form, code: form.code.toUpperCase(), value: parseFloat(form.value), min_order_value: parseFloat(form.min_order_value) || 0, max_uses: parseInt(form.max_uses) || null };
    if (editing) {
      const updated = await apiClient.entities.Coupon.update(editing.id, data);
      setCoupons(coupons.map(c => c.id === editing.id ? updated : c));
    } else {
      const created = await apiClient.entities.Coupon.create(data);
      setCoupons([created, ...coupons]);
    }
    setSaving(false);
    setDialogOpen(false);
    notify(editing ? "Coupon updated!" : "Coupon created!", "success");
  };

  const handleDelete = async (id) => {
    if (!confirm("Delete this coupon?")) return;
    await apiClient.entities.Coupon.delete(id);
    setCoupons(coupons.filter(c => c.id !== id));
    notify("Coupon deleted", "delete");
  };

  const toggleActive = async (coupon) => {
    const updated = await apiClient.entities.Coupon.update(coupon.id, { is_active: !coupon.is_active });
    setCoupons(coupons.map(c => c.id === coupon.id ? updated : c));
  };

  const copyCode = (code) => { navigator.clipboard.writeText(code); notify("Copied!", "success"); };

  const isExpired = (c) => c.expiry_date && new Date(c.expiry_date) < new Date();
  const isMaxed = (c) => c.max_uses && c.used_count >= c.max_uses;

  const generateCode = () => {
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
    const code = Array.from({ length: 8 }, () => chars[Math.floor(Math.random() * chars.length)]).join("");
    setForm({ ...form, code });
  };

  return (
    <AdminLayout>
      <div className="space-y-5">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-white font-poppins font-bold text-xl flex items-center gap-2"><Tag className="w-5 h-5 text-primary" /> Coupons</h2>
            <p className="text-gray-400 text-sm">{coupons.filter(c => c.is_active && !isExpired(c) && !isMaxed(c)).length} active coupons</p>
          </div>
          <Button onClick={openCreate} className="bg-primary hover:bg-primary/90"><Plus className="w-4 h-4 mr-2" /> Create Coupon</Button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {loading ? <div className="col-span-3 flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
            : coupons.map(coupon => {
              const expired = isExpired(coupon);
              const maxed = isMaxed(coupon);
              const statusOk = coupon.is_active && !expired && !maxed;
              return (
                <div key={coupon.id} className={`bg-gray-900 rounded-2xl border p-4 ${statusOk ? "border-gray-700" : "border-gray-800 opacity-60"}`}>
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-poppins font-bold text-lg text-white tracking-wider">{coupon.code}</span>
                        <button onClick={() => copyCode(coupon.code)} className="text-gray-500 hover:text-primary"><Copy className="w-3.5 h-3.5" /></button>
                      </div>
                      <p className="text-gray-400 text-xs mt-0.5">{coupon.description || "No description"}</p>
                    </div>
                    <div className="flex gap-1">
                      <button onClick={() => openEdit(coupon)} className="p-1.5 text-gray-500 hover:text-primary hover:bg-gray-800 rounded-lg"><Pencil className="w-3.5 h-3.5" /></button>
                      <button onClick={() => handleDelete(coupon.id)} className="p-1.5 text-gray-500 hover:text-red-400 hover:bg-gray-800 rounded-lg"><Trash2 className="w-3.5 h-3.5" /></button>
                    </div>
                  </div>

                  <div className="bg-gray-800 rounded-xl p-3 mb-3">
                    <div className="text-primary font-poppins font-black text-2xl">
                      {coupon.type === "percentage" ? `${coupon.value}% OFF` : `৳${coupon.value} OFF`}
                    </div>
                    {coupon.min_order_value > 0 && <p className="text-gray-400 text-xs">Min order: ৳{coupon.min_order_value?.toLocaleString()}</p>}
                  </div>

                  <div className="flex flex-wrap gap-1.5 mb-3">
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${statusOk ? "bg-green-900/50 text-green-400" : expired ? "bg-red-900/50 text-red-400" : maxed ? "bg-gray-700 text-gray-400" : "bg-yellow-900/50 text-yellow-400"}`}>
                      {expired ? "Expired" : maxed ? "Maxed out" : statusOk ? "Active" : "Inactive"}
                    </span>
                    <span className="text-xs bg-gray-800 text-gray-400 px-2 py-0.5 rounded-full">Used: {coupon.used_count || 0}{coupon.max_uses ? `/${coupon.max_uses}` : ""}</span>
                    {coupon.expiry_date && <span className="text-xs bg-gray-800 text-gray-400 px-2 py-0.5 rounded-full">Expires: {new Date(coupon.expiry_date).toLocaleDateString()}</span>}
                  </div>

                  <button onClick={() => toggleActive(coupon)} className={`w-full text-xs py-1.5 rounded-lg font-medium transition-colors ${coupon.is_active ? "bg-red-900/30 text-red-400 hover:bg-red-900/50" : "bg-green-900/30 text-green-400 hover:bg-green-900/50"}`}>
                    {coupon.is_active ? "Deactivate" : "Activate"}
                  </button>
                </div>
              );
            })}
        </div>
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md bg-gray-900 border-gray-800 text-white">
          <DialogHeader><DialogTitle className="text-white font-poppins">{editing ? "Edit Coupon" : "Create Coupon"}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div>
              <Label className="text-gray-300">Coupon Code *</Label>
              <div className="flex gap-2 mt-1">
                <Input value={form.code} onChange={e => setForm({ ...form, code: e.target.value.toUpperCase() })} placeholder="SAVE20" className="bg-gray-800 border-gray-700 text-white font-mono" />
                <Button type="button" variant="outline" onClick={generateCode} size="sm" className="border-gray-700 text-gray-300 hover:text-white">Generate</Button>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-gray-300">Type</Label>
                <select value={form.type} onChange={e => setForm({ ...form, type: e.target.value })} className="mt-1 w-full border border-gray-700 rounded-md px-3 py-2 text-sm bg-gray-800 text-white focus:outline-none">
                  <option value="percentage">Percentage (%)</option>
                  <option value="flat">Flat Amount (৳)</option>
                </select>
              </div>
              <div>
                <Label className="text-gray-300">Value * {form.type === "percentage" ? "(%)" : "(৳)"}</Label>
                <Input type="number" value={form.value} onChange={e => setForm({ ...form, value: e.target.value })} className="mt-1 bg-gray-800 border-gray-700 text-white" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label className="text-gray-300">Min Order (৳)</Label><Input type="number" value={form.min_order_value} onChange={e => setForm({ ...form, min_order_value: e.target.value })} className="mt-1 bg-gray-800 border-gray-700 text-white" /></div>
              <div><Label className="text-gray-300">Max Uses</Label><Input type="number" value={form.max_uses} onChange={e => setForm({ ...form, max_uses: e.target.value })} placeholder="Unlimited" className="mt-1 bg-gray-800 border-gray-700 text-white" /></div>
            </div>
            <div><Label className="text-gray-300">Expiry Date</Label><Input type="date" value={form.expiry_date} onChange={e => setForm({ ...form, expiry_date: e.target.value })} className="mt-1 bg-gray-800 border-gray-700 text-white" /></div>
            <div><Label className="text-gray-300">Description</Label><Input value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} className="mt-1 bg-gray-800 border-gray-700 text-white" placeholder="Optional description" /></div>
            <div className="flex items-center gap-4">
              <label className="flex items-center gap-2 cursor-pointer"><input type="checkbox" checked={form.is_active} onChange={e => setForm({ ...form, is_active: e.target.checked })} className="accent-primary" /><span className="text-gray-300 text-sm">Active</span></label>
              <label className="flex items-center gap-2 cursor-pointer"><input type="checkbox" checked={form.single_use_per_customer} onChange={e => setForm({ ...form, single_use_per_customer: e.target.checked })} className="accent-primary" /><span className="text-gray-300 text-sm">Single use per customer</span></label>
            </div>
            <div className="flex gap-3">
              <Button variant="outline" onClick={() => setDialogOpen(false)} className="flex-1 border-gray-700 text-gray-300">Cancel</Button>
              <Button onClick={handleSave} disabled={saving} className="flex-1 bg-primary hover:bg-primary/90">
                {saving && <Loader2 className="w-4 h-4 animate-spin mr-2" />}{editing ? "Save" : "Create"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}

