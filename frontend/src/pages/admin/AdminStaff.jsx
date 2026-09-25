import { useState, useEffect } from "react";
import { apiClient } from "@/api/apiClient";
import AdminLayout from "@/components/admin/AdminLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Users, Plus, Trash2, Edit2, Save, X, Loader2, Mail, Shield, CheckSquare, Square } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";

const ALL_PERMISSIONS = [
  { key: "orders", label: "Orders Management" },
  { key: "products", label: "Products Management" },
  { key: "sellers", label: "Sellers Management" },
  { key: "coupons", label: "Coupons & Discounts" },
  { key: "banners", label: "Banners & Promotions" },
  { key: "analytics", label: "Analytics & Reports" },
  { key: "messages", label: "Contact Messages" },
  { key: "reviews", label: "Reviews Moderation" },
  { key: "chats", label: "Customer Chats" },
  { key: "faq", label: "FAQ Management" },
  { key: "inventory", label: "Inventory Management" },
  { key: "flash_sales", label: "Flash Sales" },
  { key: "users", label: "Users Management" },
  { key: "settings", label: "Site Settings" },
  { key: "staff", label: "Staff Management" },
];

const EMPTY_FORM = { user_email: "", user_name: "", role_title: "", permissions: [], notes: "" };

export default function AdminStaff() {
  const [staff, setStaff] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [inviting, setInviting] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    apiClient.entities.StaffPermission.list("-created_date").then(s => { setStaff(s); setLoading(false); });
  }, []);

  const togglePermission = (key) => {
    const perms = form.permissions.includes(key)
      ? form.permissions.filter(p => p !== key)
      : [...form.permissions, key];
    setForm({ ...form, permissions: perms });
  };

  const selectAll = () => setForm({ ...form, permissions: ALL_PERMISSIONS.map(p => p.key) });
  const clearAll = () => setForm({ ...form, permissions: [] });

  const handleSave = async () => {
    if (!form.user_email || !form.role_title) { toast({ title: "Email and role title are required", variant: "destructive" }); return; }
    setSaving(true);
    if (editingId) {
      const updated = await apiClient.entities.StaffPermission.update(editingId, form);
      setStaff(staff.map(s => s.id === editingId ? updated : s));
      toast({ title: "Staff member updated!" });
    } else {
      // Invite the user first (server will create account and try to email)
      setInviting(true);
      let inviteResult = null;
      try {
        inviteResult = await apiClient.users.inviteUser(form.user_email, "employee");
      } catch (err) {
        inviteResult = { ok: false, error: err.message };
      }
      setInviting(false);
      if (inviteResult && inviteResult.sent === false) {
        toast({ title: "Invite created but email not sent", description: inviteResult.info?.error || 'SMTP not configured or failed', variant: 'warning' });
      }
      const created = await apiClient.entities.StaffPermission.create({ ...form, user_id: form.user_email, is_active: true });
      setStaff([created, ...staff]);
      toast({ title: "Staff member invited & permissions set!" });
    }
    setSaving(false);
    setShowForm(false);
    setEditingId(null);
    setForm(EMPTY_FORM);
  };

  const handleEdit = (member) => {
    setForm({ user_email: member.user_email, user_name: member.user_name || "", role_title: member.role_title || "", permissions: member.permissions || [], notes: member.notes || "" });
    setEditingId(member.id);
    setShowForm(true);
  };

  const handleDelete = async (id) => {
    await apiClient.entities.StaffPermission.delete(id);
    setStaff(staff.filter(s => s.id !== id));
    toast({ title: "Staff member removed" });
  };

  const handleToggleActive = async (member) => {
    const updated = await apiClient.entities.StaffPermission.update(member.id, { is_active: !member.is_active });
    setStaff(staff.map(s => s.id === member.id ? updated : s));
  };

  return (
    <AdminLayout>
      <div className="space-y-5">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-white font-poppins font-bold text-xl flex items-center gap-2">
              <Users className="w-5 h-5 text-primary" /> Staff & Employees
            </h2>
            <p className="text-gray-400 text-sm mt-0.5">Invite team members and control their access</p>
          </div>
          <Button onClick={() => { setShowForm(!showForm); setEditingId(null); setForm(EMPTY_FORM); }} className="bg-primary hover:bg-primary/90 gap-2">
            <Plus className="w-4 h-4" /> Add Staff
          </Button>
        </div>

        {/* Form */}
        {showForm && (
          <div className="bg-gray-900 border border-gray-700 rounded-2xl p-5 space-y-4">
            <h3 className="text-white font-semibold">{editingId ? "Edit Staff Member" : "Invite New Staff Member"}</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label className="text-gray-300">Email Address *</Label>
                <Input value={form.user_email} onChange={e => setForm({ ...form, user_email: e.target.value })}
                  placeholder="employee@example.com" disabled={!!editingId}
                  className="mt-1 bg-gray-800 border-gray-700 text-white placeholder:text-gray-500" />
              </div>
              <div>
                <Label className="text-gray-300">Display Name</Label>
                <Input value={form.user_name} onChange={e => setForm({ ...form, user_name: e.target.value })}
                  placeholder="John Doe" className="mt-1 bg-gray-800 border-gray-700 text-white placeholder:text-gray-500" />
              </div>
              <div>
                <Label className="text-gray-300">Role / Title *</Label>
                <Input value={form.role_title} onChange={e => setForm({ ...form, role_title: e.target.value })}
                  placeholder="e.g. Order Manager, Executive, Support Agent"
                  className="mt-1 bg-gray-800 border-gray-700 text-white placeholder:text-gray-500" />
              </div>
              <div>
                <Label className="text-gray-300">Notes</Label>
                <Input value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })}
                  placeholder="Optional notes" className="mt-1 bg-gray-800 border-gray-700 text-white placeholder:text-gray-500" />
              </div>
            </div>

            {/* Permissions */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <Label className="text-gray-300">Access Permissions</Label>
                <div className="flex gap-2">
                  <button onClick={selectAll} className="text-xs text-primary hover:underline">Select All</button>
                  <span className="text-gray-600">|</span>
                  <button onClick={clearAll} className="text-xs text-gray-400 hover:underline">Clear All</button>
                </div>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {ALL_PERMISSIONS.map(p => (
                  <button key={p.key} onClick={() => togglePermission(p.key)}
                    className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-sm text-left transition-colors ${form.permissions.includes(p.key) ? "border-primary bg-primary/10 text-primary" : "border-gray-700 bg-gray-800 text-gray-400 hover:border-gray-500"}`}>
                    {form.permissions.includes(p.key) ? <CheckSquare className="w-4 h-4 flex-shrink-0" /> : <Square className="w-4 h-4 flex-shrink-0" />}
                    <span className="text-xs">{p.label}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <Button onClick={handleSave} disabled={saving || inviting} className="bg-primary hover:bg-primary/90 gap-2">
                {(saving || inviting) ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                {inviting ? "Sending Invite..." : editingId ? "Save Changes" : "Invite & Set Permissions"}
              </Button>
              <Button variant="outline" onClick={() => { setShowForm(false); setEditingId(null); setForm(EMPTY_FORM); }}
                className="border-gray-700 text-gray-300 hover:bg-gray-800"><X className="w-4 h-4" /></Button>
            </div>
          </div>
        )}

        {/* Staff List */}
        {loading ? (
          <div className="flex justify-center py-10"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
        ) : staff.length === 0 ? (
          <div className="bg-gray-900 rounded-2xl border border-gray-800 p-16 text-center">
            <Users className="w-12 h-12 mx-auto text-gray-700 mb-3" />
            <p className="text-gray-400">No staff members yet. Invite your first team member above.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {staff.map(member => (
              <div key={member.id} className="bg-gray-900 border border-gray-800 rounded-2xl p-4">
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 bg-primary/20 rounded-xl flex items-center justify-center flex-shrink-0">
                      <Shield className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-white font-semibold">{member.user_name || member.user_email}</p>
                        <Badge className={`text-xs ${member.is_active ? "bg-green-900/50 text-green-400" : "bg-gray-800 text-gray-500"}`}>
                          {member.is_active ? "Active" : "Inactive"}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <Mail className="w-3 h-3 text-gray-500" />
                        <span className="text-gray-400 text-xs">{member.user_email}</span>
                      </div>
                      <p className="text-primary text-xs font-medium mt-1">{member.role_title}</p>
                    </div>
                  </div>
                  <div className="flex gap-2 ml-13 sm:ml-0">
                    <Button size="sm" variant="outline" onClick={() => handleToggleActive(member)}
                      className={`border-gray-700 text-xs h-7 ${member.is_active ? "text-yellow-400 hover:bg-yellow-900/20" : "text-green-400 hover:bg-green-900/20"}`}>
                      {member.is_active ? "Deactivate" : "Activate"}
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => handleEdit(member)}
                      className="border-gray-700 text-gray-300 hover:bg-gray-800 h-7"><Edit2 className="w-3.5 h-3.5" /></Button>
                    <Button size="sm" variant="outline" onClick={() => handleDelete(member.id)}
                      className="border-red-900 text-red-400 hover:bg-red-900/20 h-7"><Trash2 className="w-3.5 h-3.5" /></Button>
                  </div>
                </div>
                {member.permissions?.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {member.permissions.map(perm => (
                      <span key={perm} className="px-2 py-0.5 bg-gray-800 text-gray-400 rounded-full text-xs border border-gray-700">
                        {ALL_PERMISSIONS.find(p => p.key === perm)?.label || perm}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </AdminLayout>
  );
}

