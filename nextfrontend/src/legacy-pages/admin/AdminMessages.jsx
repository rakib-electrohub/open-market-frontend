import { useState, useEffect } from "react";
import { apiClient } from "@/api/apiClient";
import AdminLayout from "@/components/admin/AdminLayout";
import { Mail, Eye, Trash2, Search, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

export default function AdminMessages() {
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState(null);

  const load = () => {
    apiClient.entities.ContactMessage.list("-created_date", 100).then(m => {
      setMessages(m);
      setLoading(false);
    });
  };

  useEffect(() => { load(); }, []);

  const markRead = async (msg) => {
    await apiClient.entities.ContactMessage.update(msg.id, { status: "read" });
    load();
    if (selected?.id === msg.id) setSelected({ ...msg, status: "read" });
  };

  const markReplied = async (msg) => {
    await apiClient.entities.ContactMessage.update(msg.id, { status: "replied" });
    toast.success("Marked as replied");
    load();
    setSelected(null);
  };

  const deleteMsg = async (msg) => {
    await apiClient.entities.ContactMessage.delete(msg.id);
    toast.success("Message deleted");
    load();
    setSelected(null);
  };

  const filtered = messages.filter(m =>
    m.name?.toLowerCase().includes(search.toLowerCase()) ||
    m.email?.toLowerCase().includes(search.toLowerCase()) ||
    m.subject?.toLowerCase().includes(search.toLowerCase()) ||
    m.message?.toLowerCase().includes(search.toLowerCase())
  );

  const statusBadge = (status) => {
    if (status === "new") return <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-red-900/50 text-red-400">New</span>;
    if (status === "replied") return <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-green-900/50 text-green-400">Replied</span>;
    return <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-gray-700 text-gray-400">Read</span>;
  };

  return (
    <AdminLayout>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-poppins font-bold text-xl text-white">Contact Messages</h1>
            <p className="text-gray-400 text-sm">{messages.filter(m => m.status === "new").length} unread messages</p>
          </div>
          <div className="relative w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
            <Input className="pl-9 bg-gray-800 border-gray-700 text-white placeholder:text-gray-500" placeholder="Search messages..." value={search} onChange={e => setSearch(e.target.value)} />
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 min-h-[60vh]">
          {/* Message List */}
          <div className="lg:col-span-1 bg-gray-900 rounded-2xl border border-gray-800 overflow-hidden flex flex-col">
            {loading ? (
              <div className="flex-1 flex items-center justify-center text-gray-500">Loading...</div>
            ) : filtered.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center text-gray-500 p-6 text-center">
                <Mail className="w-10 h-10 mb-3 opacity-30" />
                <p className="text-sm">No messages yet</p>
              </div>
            ) : (
              <div className="overflow-y-auto flex-1 divide-y divide-gray-800">
                {filtered.map(msg => (
                  <div
                    key={msg.id}
                    onClick={() => { setSelected(msg); if (msg.status === "new") markRead(msg); }}
                    className={`p-4 cursor-pointer hover:bg-gray-800/60 transition-colors ${selected?.id === msg.id ? "bg-gray-800" : ""} ${msg.status === "new" ? "border-l-2 border-primary" : ""}`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className={`text-sm font-semibold ${msg.status === "new" ? "text-white" : "text-gray-300"}`}>{msg.name}</span>
                      {statusBadge(msg.status)}
                    </div>
                    <div className="text-xs text-gray-500 mb-1">{msg.email}</div>
                    <div className="text-xs text-gray-400 truncate">{msg.subject || msg.message}</div>
                    <div className="text-xs text-gray-600 mt-1">{new Date(msg.created_date).toLocaleDateString()}</div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Message Detail */}
          <div className="lg:col-span-2 bg-gray-900 rounded-2xl border border-gray-800 p-6 flex flex-col">
            {!selected ? (
              <div className="flex-1 flex flex-col items-center justify-center text-gray-500">
                <Mail className="w-12 h-12 mb-3 opacity-20" />
                <p className="text-sm">Select a message to view</p>
              </div>
            ) : (
              <>
                <div className="flex items-start justify-between mb-6">
                  <div>
                    <h2 className="font-poppins font-bold text-white text-lg">{selected.subject || "No Subject"}</h2>
                    <div className="flex items-center gap-3 mt-1">
                      <span className="text-sm text-gray-400">From: <span className="text-white font-medium">{selected.name}</span></span>
                      {statusBadge(selected.status)}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    {selected.status !== "replied" && (
                      <Button size="sm" variant="outline" className="border-green-700 text-green-400 hover:bg-green-900 gap-1" onClick={() => markReplied(selected)}>
                        <CheckCircle className="w-3.5 h-3.5" /> Mark Replied
                      </Button>
                    )}
                    <Button size="sm" variant="outline" className="border-red-700 text-red-400 hover:bg-red-900 gap-1" onClick={() => deleteMsg(selected)}>
                      <Trash2 className="w-3.5 h-3.5" /> Delete
                    </Button>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 mb-6 text-sm">
                  <div className="bg-gray-800 rounded-xl p-3">
                    <div className="text-gray-500 text-xs mb-0.5">Email</div>
                    <a href={`mailto:${selected.email}`} className="text-primary hover:underline">{selected.email}</a>
                  </div>
                  {selected.phone && (
                    <div className="bg-gray-800 rounded-xl p-3">
                      <div className="text-gray-500 text-xs mb-0.5">Phone</div>
                      <a href={`tel:${selected.phone}`} className="text-white">{selected.phone}</a>
                    </div>
                  )}
                  <div className="bg-gray-800 rounded-xl p-3">
                    <div className="text-gray-500 text-xs mb-0.5">Received</div>
                    <div className="text-white">{new Date(selected.created_date).toLocaleString()}</div>
                  </div>
                </div>

                <div className="flex-1 bg-gray-800 rounded-xl p-4">
                  <div className="text-gray-500 text-xs mb-2 uppercase tracking-wide">Message</div>
                  <p className="text-gray-200 text-sm leading-relaxed whitespace-pre-wrap">{selected.message}</p>
                </div>

                <div className="mt-4">
                  <a href={`mailto:${selected.email}?subject=Re: ${selected.subject || "Your message"}`}>
                    <Button className="bg-primary hover:bg-primary/90 gap-2 w-full">
                      <Mail className="w-4 h-4" /> Reply via Email
                    </Button>
                  </a>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}

