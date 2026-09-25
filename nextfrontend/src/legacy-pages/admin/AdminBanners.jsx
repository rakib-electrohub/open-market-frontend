import { useState, useEffect } from "react";
import { apiClient } from "@/api/apiClient";
import AdminLayout from "@/components/admin/AdminLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Plus, Pencil, Trash2, Image, Loader2, Eye, EyeOff } from "lucide-react";
import { usePersistentToast } from "@/components/ui/PersistentToast";

const EMPTY = { title: "", subtitle: "", image: "", link: "", button_text: "Shop Now", sort_order: 0, is_active: true, position: "hero" };

export default function AdminBanners() {
  const [banners, setBanners] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false);
  const toast = usePersistentToast();

  useEffect(() => { apiClient.entities.Banner.list("sort_order").then(b => { setBanners(b); setLoading(false); }); }, []);

  const openCreate = () => { setEditing(null); setForm(EMPTY); setDialogOpen(true); };
  const openEdit = (b) => { setEditing(b); setForm({ ...b }); setDialogOpen(true); };

  const handleSave = async () => {
    if (!form.title || !form.image) { toast("Title and image required", "error"); return; }
    setSaving(true);
    const data = { ...form, sort_order: parseInt(form.sort_order) || 0 };
    if (editing) {
      const updated = await apiClient.entities.Banner.update(editing.id, data);
      setBanners(banners.map(b => b.id === editing.id ? updated : b));
    } else {
      const created = await apiClient.entities.Banner.create(data);
      setBanners([...banners, created]);
    }
    setSaving(false);
    setDialogOpen(false);
    toast(editing ? "Banner updated!" : "Banner created!", "success");
  };

  const handleDelete = async (id) => {
    if (!confirm("Delete this banner?")) return;
    await apiClient.entities.Banner.delete(id);
    setBanners(banners.filter(b => b.id !== id));
    toast("Banner deleted", "delete");
  };

  const toggleActive = async (banner) => {
    const updated = await apiClient.entities.Banner.update(banner.id, { is_active: !banner.is_active });
    setBanners(banners.map(b => b.id === banner.id ? updated : b));
  };

  return (
    <AdminLayout>
      <div className="space-y-5">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-white font-poppins font-bold text-xl flex items-center gap-2"><Image className="w-5 h-5 text-primary" /> Banners</h2>
            <p className="text-gray-400 text-sm">{banners.filter(b => b.is_active).length} active banners</p>
          </div>
          <Button onClick={openCreate} className="bg-primary hover:bg-primary/90"><Plus className="w-4 h-4 mr-2" /> Add Banner</Button>
        </div>

        {loading ? <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
          : banners.length === 0 ? (
            <div className="text-center py-20 text-gray-500">
              <Image className="w-12 h-12 mx-auto mb-3 text-gray-700" />
              <p>No banners yet. Add your first banner!</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {banners.map(banner => (
                <div key={banner.id} className={`bg-gray-900 rounded-2xl border overflow-hidden ${banner.is_active ? "border-gray-700" : "border-gray-800 opacity-60"}`}>
                  <div className="relative aspect-video bg-gray-800 overflow-hidden">
                    {banner.image ? <img src={banner.image} alt={banner.title} className="w-full h-full object-cover" /> : <Image className="w-12 h-12 mx-auto mt-12 text-gray-600" />}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                    <div className="absolute bottom-2 left-3">
                      <p className="text-white font-semibold text-sm">{banner.title}</p>
                      {banner.subtitle && <p className="text-white/70 text-xs">{banner.subtitle}</p>}
                    </div>
                    <div className="absolute top-2 right-2 flex gap-1">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${banner.position === "hero" ? "bg-primary text-white" : "bg-gray-700 text-gray-300"}`}>{banner.position}</span>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${banner.is_active ? "bg-green-900/80 text-green-400" : "bg-gray-800 text-gray-500"}`}>{banner.is_active ? "Active" : "Hidden"}</span>
                    </div>
                  </div>
                  <div className="p-3 flex items-center gap-2">
                    <div className="flex-1 min-w-0">
                      <p className="text-gray-400 text-xs truncate">{banner.link || "No link"}</p>
                      <p className="text-gray-500 text-xs">Order: {banner.sort_order}</p>
                    </div>
                    <button onClick={() => toggleActive(banner)} className={`p-1.5 rounded-lg transition-colors ${banner.is_active ? "text-yellow-400 hover:bg-yellow-900/20" : "text-green-400 hover:bg-green-900/20"}`}>
                      {banner.is_active ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                    <button onClick={() => openEdit(banner)} className="p-1.5 text-gray-400 hover:text-primary hover:bg-gray-800 rounded-lg"><Pencil className="w-4 h-4" /></button>
                    <button onClick={() => handleDelete(banner.id)} className="p-1.5 text-gray-400 hover:text-red-400 hover:bg-gray-800 rounded-lg"><Trash2 className="w-4 h-4" /></button>
                  </div>
                </div>
              ))}
            </div>
          )}
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md bg-gray-900 border-gray-800 text-white">
          <DialogHeader><DialogTitle className="text-white font-poppins">{editing ? "Edit Banner" : "Add Banner"}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div><Label className="text-gray-300">Title *</Label><Input value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} className="mt-1 bg-gray-800 border-gray-700 text-white" /></div>
            <div><Label className="text-gray-300">Subtitle</Label><Input value={form.subtitle} onChange={e => setForm({ ...form, subtitle: e.target.value })} className="mt-1 bg-gray-800 border-gray-700 text-white" /></div>
            <div>
              <Label className="text-gray-300">Image URL *</Label>
              <Input value={form.image} onChange={e => setForm({ ...form, image: e.target.value })} placeholder="https://..." className="mt-1 bg-gray-800 border-gray-700 text-white" />
              {form.image && <img src={form.image} alt="" className="mt-2 w-full h-32 object-cover rounded-lg border border-gray-700" />}
            </div>
            <div><Label className="text-gray-300">Link URL</Label><Input value={form.link} onChange={e => setForm({ ...form, link: e.target.value })} placeholder="/products" className="mt-1 bg-gray-800 border-gray-700 text-white" /></div>
            <div><Label className="text-gray-300">Button Text</Label><Input value={form.button_text} onChange={e => setForm({ ...form, button_text: e.target.value })} className="mt-1 bg-gray-800 border-gray-700 text-white" /></div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-gray-300">Position</Label>
                <select value={form.position} onChange={e => setForm({ ...form, position: e.target.value })} className="mt-1 w-full border border-gray-700 rounded-md px-3 py-2 text-sm bg-gray-800 text-white focus:outline-none">
                  <option value="hero">Hero</option>
                  <option value="mid">Mid Page</option>
                  <option value="bottom">Bottom</option>
                </select>
              </div>
              <div><Label className="text-gray-300">Sort Order</Label><Input type="number" value={form.sort_order} onChange={e => setForm({ ...form, sort_order: e.target.value })} className="mt-1 bg-gray-800 border-gray-700 text-white" /></div>
            </div>
            <label className="flex items-center gap-2 cursor-pointer"><input type="checkbox" checked={form.is_active} onChange={e => setForm({ ...form, is_active: e.target.checked })} className="accent-primary" /><span className="text-gray-300 text-sm">Active</span></label>
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

