import { useState, useEffect, useRef } from "react";
import { apiClient } from "@/api/apiClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Send, Loader2, MessageCircle, ArrowLeft } from "lucide-react";
import SellerLayout from "@/components/seller/SellerLayout";
import ProductDetailsModal from "@/components/ProductDetailsModal";

export default function SellerChats() {
  const [user, setUser] = useState(null);
  const [chats, setChats] = useState([]);
  const [selectedChat, setSelectedChat] = useState(null);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);
  const [mobileView, setMobileView] = useState("list"); // "list" | "chat"
  const [showProductModal, setShowProductModal] = useState(false);
  const bottomRef = useRef(null);

  useEffect(() => {
    apiClient.auth.me().then(async u => {
      setUser(u);
      const sellers = await apiClient.entities.Seller.filter({ user_id: u.id });
      if (!sellers.length) { setLoading(false); return; }
      const sellerId = sellers[0].id;
      const c = await apiClient.entities.ProductChat.filter({ seller_id: sellerId });
      setChats(c);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  useEffect(() => {
    const unsub = apiClient.entities.ProductChat.subscribe(event => {
      setChats(prev => {
        if (event.type === "create") return [...prev, event.data];
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
      sender_name: user.full_name || "Seller",
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

  const openChat = async (chat) => {
    setSelectedChat(chat);
    setMobileView("chat");
    if (!chat.is_read_by_seller) {
      const updated = await apiClient.entities.ProductChat.update(chat.id, { is_read_by_seller: true });
      setChats(chats.map(c => c.id === updated.id ? updated : c));
    }
  };

  return (
    <SellerLayout mainClassName="p-0 overflow-hidden flex flex-col">
      {/* Chat UI fills the remaining height */}
      <div className="flex flex-1 overflow-hidden" style={{ height: "calc(100vh - 3.5rem)" }}>

        {/* Chat list — hidden on mobile when chat is open */}
        <div className={`${mobileView === "chat" ? "hidden lg:flex" : "flex"} w-full lg:w-72 border-r border-border bg-white flex-col flex-shrink-0`}>
          <div className="p-4 border-b border-border">
            <h2 className="font-poppins font-semibold flex items-center gap-2 text-foreground">
              <MessageCircle className="w-4 h-4 text-primary" /> Customer Chats
            </h2>
          </div>
          <div className="flex-1 overflow-y-auto">
            {loading ? (
              <div className="flex justify-center py-8"><Loader2 className="w-5 h-5 animate-spin text-primary" /></div>
            ) : chats.length === 0 ? (
              <p className="text-muted-foreground text-sm text-center py-8">No chats yet</p>
            ) : chats.map(chat => (
              <button key={chat.id} onClick={() => openChat(chat)}
                className={`w-full text-left px-4 py-3 border-b border-border hover:bg-muted/30 transition-colors ${selectedChat?.id === chat.id ? "bg-primary/5 border-l-2 border-l-primary" : ""}`}>
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-foreground text-sm font-medium truncate">{chat.buyer_name}</p>
                    <p className="text-muted-foreground text-xs truncate">{chat.product_name}</p>
                    {chat.messages?.length > 0 && (
                      <p className="text-muted-foreground text-xs truncate mt-0.5">
                        {chat.messages[chat.messages.length - 1].text}
                      </p>
                    )}
                  </div>
                  {!chat.is_read_by_seller && (
                    <span className="w-2 h-2 rounded-full bg-primary flex-shrink-0 mt-1.5" />
                  )}
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Chat window — full width on mobile when open */}
        <div className={`${mobileView === "list" ? "hidden lg:flex" : "flex"} flex-1 flex-col bg-gray-50`}>
          {!selectedChat ? (
            <div className="flex-1 flex items-center justify-center text-muted-foreground">
              <div className="text-center">
                <MessageCircle className="w-12 h-12 mx-auto mb-3 opacity-30" />
                <p className="text-sm">Select a conversation</p>
              </div>
            </div>
          ) : (
            <>
              <div className="px-4 py-3 bg-white border-b border-border flex flex-col gap-3 shadow-sm lg:flex-row lg:items-center lg:justify-between">
                <div className="flex items-center gap-3">
                  <button onClick={() => setMobileView("list")} className="lg:hidden text-muted-foreground hover:text-foreground p-1">
                    <ArrowLeft className="w-4 h-4" />
                  </button>
                  <div>
                    <p className="font-semibold text-sm">{selectedChat.buyer_name}</p>
                    <p className="text-muted-foreground text-xs">{selectedChat.product_name}</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowProductModal(true)}
                  className="inline-flex items-center gap-1.5 text-xs font-medium bg-primary/10 text-primary px-3 py-1.5 rounded-lg hover:bg-primary hover:text-white transition-colors"
                >
                  View Product
                </button>
              </div>
              <div className="flex-1 overflow-y-auto p-4 space-y-2">
                {selectedChat.messages?.map((msg, i) => (
                  <div key={i} className={`flex ${msg.role === "seller" ? "justify-end" : "justify-start"}`}>
                    <div className={`max-w-xs sm:max-w-sm px-3 py-2 rounded-2xl text-sm shadow-sm ${msg.role === "seller" ? "bg-primary text-white rounded-br-sm" : "bg-white text-foreground border border-border rounded-bl-sm"}`}>
                      <p>{msg.text}</p>
                      <p className={`text-[10px] mt-0.5 ${msg.role === "seller" ? "text-white/70 text-right" : "text-muted-foreground"}`}>
                        {new Date(msg.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                      </p>
                    </div>
                  </div>
                ))}
                <div ref={bottomRef} />
              </div>
              <div className="flex gap-2 p-3 bg-white border-t border-border">
                <Input value={text} onChange={e => setText(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && handleSend()}
                  placeholder="Type a reply..." className="bg-gray-50" />
                <Button onClick={handleSend} disabled={sending || !text.trim()} className="bg-primary hover:bg-primary/90 flex-shrink-0">
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
    </SellerLayout>
  );
}

