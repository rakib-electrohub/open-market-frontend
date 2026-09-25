import { useState, useEffect, useRef } from "react";
import { apiClient } from "@/api/apiClient";
import AdminLayout from "@/components/admin/AdminLayout";
import ProductDetailsModal from "@/components/ProductDetailsModal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Send, Loader2, MessageCircle, Package } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";

export default function AdminChats() {
  const [user, setUser] = useState(null);
  const [chats, setChats] = useState([]);
  const [selectedChat, setSelectedChat] = useState(null);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);
  const [showProductModal, setShowProductModal] = useState(false);
  const bottomRef = useRef(null);

  useEffect(() => {
    apiClient.auth.me().then(u => setUser(u)).catch(() => {});
    apiClient.entities.ProductChat.list("-last_message_at", 100).then(c => {
      setChats(c);
      setLoading(false);
    });
  }, []);

  useEffect(() => {
    const unsub = apiClient.entities.ProductChat.subscribe(event => {
      setChats(prev => {
        if (event.type === "create") return [event.data, ...prev];
        if (event.type === "update") {
          const updated = prev.map(c => c.id === event.id ? event.data : c);
          if (selectedChat?.id === event.id) setSelectedChat(event.data);
          return updated;
        }
        return prev;
      });
    });
    return unsub;
  }, [selectedChat?.id]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [selectedChat?.messages]);

  const handleSend = async () => {
    if (!text.trim() || !selectedChat || !user) return;
    setSending(true);
    const newMsg = {
      sender_email: user.email,
      sender_name: user.full_name || "Admin",
      role: "seller",
      text: text.trim(),
      timestamp: new Date().toISOString(),
    };
    const updated = await apiClient.entities.ProductChat.update(selectedChat.id, {
      messages: [...(selectedChat.messages || []), newMsg],
      last_message_at: new Date().toISOString(),
      is_read_by_seller: true,
    });
    setSelectedChat(updated);
    setChats(chats.map(c => c.id === updated.id ? updated : c));
    setText("");
    setSending(false);
  };

  return (
    <AdminLayout>
      <div className="flex gap-0 h-[calc(100vh-8rem)] -m-4 sm:-m-6 overflow-hidden rounded-xl border border-gray-800">
        {/* Chat list */}
        <div className="w-64 bg-gray-900 border-r border-gray-800 flex flex-col">
          <div className="p-3 border-b border-gray-800">
            <p className="text-white font-semibold text-sm">All Product Chats</p>
            <p className="text-gray-500 text-xs">{chats.length} conversations</p>
          </div>
          <div className="flex-1 overflow-y-auto">
            {loading ? (
              <div className="flex justify-center py-8"><Loader2 className="w-5 h-5 animate-spin text-primary" /></div>
            ) : chats.length === 0 ? (
              <p className="text-gray-500 text-sm text-center py-8">No chats yet</p>
            ) : chats.map(chat => (
              <button key={chat.id} onClick={() => setSelectedChat(chat)}
                className={`w-full text-left px-3 py-2.5 border-b border-gray-800/50 hover:bg-gray-800 transition-colors ${selectedChat?.id === chat.id ? "bg-gray-800" : ""}`}>
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-white text-xs font-medium truncate">{chat.buyer_name}</p>
                    <p className="text-gray-500 text-xs truncate">{chat.product_name}</p>
                    {chat.messages?.length > 0 && (
                      <p className="text-gray-400 text-xs truncate mt-0.5">{chat.messages[chat.messages.length - 1].text}</p>
                    )}
                  </div>
                  {!chat.is_read_by_seller && <span className="w-2 h-2 rounded-full bg-primary flex-shrink-0 mt-1" />}
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Chat window */}
        <div className="flex-1 flex flex-col bg-gray-950">
          {!selectedChat ? (
            <div className="flex-1 flex items-center justify-center text-gray-500">
              <div className="text-center">
                <MessageCircle className="w-10 h-10 mx-auto mb-2 opacity-20" />
                <p className="text-sm">Select a conversation</p>
              </div>
            </div>
          ) : (
            <>
              <div className="px-4 py-3 bg-gray-900 border-b border-gray-800 flex items-center justify-between">
                <div>
                  <p className="text-white font-semibold text-sm">{selectedChat.buyer_name}</p>
                  <p className="text-gray-400 text-xs">{selectedChat.buyer_email}</p>
                </div>
                <button
                  onClick={() => setShowProductModal(true)}
                  className="flex items-center gap-1.5 text-xs font-medium bg-primary/10 text-primary px-3 py-1.5 rounded-lg hover:bg-primary hover:text-white transition-colors"
                >
                  <Package className="w-3.5 h-3.5" />
                  View Product
                </button>
              </div>
              <div className="flex-1 overflow-y-auto p-4 space-y-2">
                {selectedChat.messages?.map((msg, i) => (
                  <div key={i} className={`flex ${msg.role === "seller" ? "justify-end" : "justify-start"}`}>
                    <div className={`max-w-xs px-3 py-2 rounded-xl text-sm ${msg.role === "seller" ? "bg-primary text-white" : "bg-gray-800 text-white"}`}>
                      <p className="text-[10px] font-semibold mb-0.5 opacity-70">{msg.sender_name}</p>
                      <p>{msg.text}</p>
                      <p className={`text-[10px] mt-0.5 ${msg.role === "seller" ? "text-white/60 text-right" : "text-gray-500"}`}>
                        {new Date(msg.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                      </p>
                    </div>
                  </div>
                ))}
                <div ref={bottomRef} />
              </div>
              <div className="flex gap-2 p-3 bg-gray-900 border-t border-gray-800">
                <Input value={text} onChange={e => setText(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && handleSend()}
                  placeholder="Reply as admin/seller..." className="bg-gray-800 border-gray-700 text-white text-sm" />
                <Button onClick={handleSend} disabled={sending || !text.trim()} className="bg-primary hover:bg-primary/90">
                  {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                </Button>
              </div>
            </>
          )}
        </div>

        <ProductDetailsModal
          isOpen={showProductModal}
          onClose={() => setShowProductModal(false)}
          productId={selectedChat?.product_id}
        />
      </div>
    </AdminLayout>
  );
}

