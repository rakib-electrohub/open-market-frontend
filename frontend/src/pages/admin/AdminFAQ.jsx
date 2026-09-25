import { useState, useEffect } from "react";
import { apiClient } from "@/api/apiClient";
import AdminLayout from "@/components/admin/AdminLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import RichTextEditor from "@/components/RichTextEditor";
import RichTextRenderer from "@/components/RichTextRenderer";
import { Plus, Pencil, Trash2, HelpCircle, Loader2, Eye, EyeOff } from "lucide-react";
import { usePersistentToast } from "@/components/ui/PersistentToast";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

const EMPTY = { question: "", answer: "", sort_order: 0, is_active: true };

export default function AdminFAQ() {
  const [faqs, setFaqs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false);
  const notify = usePersistentToast();

  const load = () => {
    apiClient.entities.FAQ.list("sort_order", 100).then(f => { setFaqs(f); setLoading(false); });
  };
  useEffect(() => { load(); }, []);

  const openNew = () => { setForm(EMPTY); setEditing(null); setDialogOpen(true); };
  const openEdit = (faq) => { setForm({ question: faq.question, answer: faq.answer, sort_order: faq.sort_order || 0, is_active: faq.is_active !== false }); setEditing(faq); setDialogOpen(true); };

  const save = async () => {
    if (!form.question.trim() || !form.answer.trim()) return;
    setSaving(true);
    if (editing) {
      await apiClient.entities.FAQ.update(editing.id, form);
      notify("FAQ updated", "success");
    } else {
      await apiClient.entities.FAQ.create(form);
      notify("FAQ added", "success");
    }
    setSaving(false);
    setDialogOpen(false);
    load();
  };

  const toggleActive = async (faq) => {
    await apiClient.entities.FAQ.update(faq.id, { is_active: !faq.is_active });
    load();
  };

  const del = async (faq) => {
    await apiClient.entities.FAQ.delete(faq.id);
      notify("FAQ deleted", "delete");
    load();
  };

  return (
    <AdminLayout>
      <div className="space-y-5">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-white font-poppins font-bold text-xl flex items-center gap-2">
              <HelpCircle className="w-5 h-5 text-primary" /> FAQ Manager
            </h2>
            <p className="text-gray-400 text-sm">{faqs.filter(f => f.is_active !== false).length} active FAQs</p>
          </div>
          <Button onClick={openNew} className="bg-primary hover:bg-primary/90 gap-2">
            <Plus className="w-4 h-4" /> Add FAQ
          </Button>
        </div>

        {loading ? (
          <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
        ) : faqs.length === 0 ? (
          <div className="text-center py-16 text-gray-500">
            <HelpCircle className="w-12 h-12 mx-auto mb-3 opacity-20" />
            <p>No FAQs yet. Add your first one!</p>
          </div>
        ) : (
          <div className="space-y-2">
            {faqs.map((faq, i) => (
              <div key={faq.id} className={`bg-gray-900 border rounded-xl p-4 ${faq.is_active === false ? "border-gray-800 opacity-60" : "border-gray-700"}`}>
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-white text-sm font-semibold mb-1">{i + 1}. {faq.question}</p>
                    <RichTextRenderer content={faq.answer} className="text-gray-400 text-xs leading-relaxed line-clamp-2" />
                  </div>
                  <div className="flex gap-1.5 flex-shrink-0">
                    <button onClick={() => toggleActive(faq)} title={faq.is_active === false ? "Activate" : "Hide"}
                      className="p-1.5 rounded-lg hover:bg-gray-700 text-gray-400 hover:text-white transition-colors">
                      {faq.is_active === false ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                    <button onClick={() => openEdit(faq)}
                      className="p-1.5 rounded-lg hover:bg-gray-700 text-gray-400 hover:text-white transition-colors">
                      <Pencil className="w-4 h-4" />
                    </button>
                    <button onClick={() => del(faq)}
                      className="p-1.5 rounded-lg hover:bg-red-900/40 text-gray-400 hover:text-red-400 transition-colors">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="bg-gray-900 border-gray-700 text-white">
          <DialogHeader>
            <DialogTitle className="text-white">{editing ? "Edit FAQ" : "Add New FAQ"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            <div>
              <Label className="text-gray-300">Question *</Label>
              <Input value={form.question} onChange={e => setForm({ ...form, question: e.target.value })}
                placeholder="e.g. How do I track my order?" className="mt-1.5 bg-gray-800 border-gray-700 text-white" />
            </div>
            <div>
              <Label className="text-gray-300">Answer *</Label>
              <RichTextEditor value={form.answer} onChange={value => setForm({ ...form, answer: value })} minHeight={220} className="mt-1.5" />
            </div>
            <div className="flex items-center gap-4">
              <div className="flex-1">
                <Label className="text-gray-300">Sort Order</Label>
                <Input type="number" value={form.sort_order} onChange={e => setForm({ ...form, sort_order: Number(e.target.value) })}
                  className="mt-1.5 bg-gray-800 border-gray-700 text-white w-24" />
              </div>
              <label className="flex items-center gap-2 cursor-pointer mt-5">
                <input type="checkbox" checked={form.is_active !== false} onChange={e => setForm({ ...form, is_active: e.target.checked })} className="accent-primary w-4 h-4" />
                <span className="text-gray-300 text-sm">Active (show on FAQ page)</span>
              </label>
            </div>
            <div className="flex gap-3 pt-2">
              <Button variant="outline" onClick={() => setDialogOpen(false)} className="flex-1 border-gray-700 text-gray-300">Cancel</Button>
              <Button onClick={save} disabled={saving} className="flex-1 bg-primary hover:bg-primary/90">
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : editing ? "Update" : "Add FAQ"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}

