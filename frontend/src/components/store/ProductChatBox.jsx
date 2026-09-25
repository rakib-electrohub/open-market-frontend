import { useState, useEffect, useRef } from "react";
import { apiClient } from "@/api/apiClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { MessageCircle, X, Send, Loader2 } from "lucide-react";

export default function ProductChatBox({ product }) {
  const [open, setOpen] = useState(false);
  const [user, setUser] = useState(null);
  const [chat, setChat] = useState(null);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef(null);

  useEffect(() => {
    apiClient.auth.me().then(setUser).catch(() => {});
  }, []);

  useEffect(() => {
    if (!open || !user) return;
    setLoading(true);
    apiClient.entities.ProductChat.filter({ product_id: product.id, buyer_email: user.email })
      .then(results => {
        if (results.length) setChat(results[0]);
        setLoading(false);
      });
  }, [open, user, product.id]);

  // Subscribe to real-time updates
  useEffect(() => {
    if (!chat) return;
    const unsub = apiClient.entities.ProductChat.subscribe(event => {
      if (event.id === chat.id) setChat(event.data);
    });
    return unsub;
  }, [chat?.id]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chat?.messages]);

  const handleSend = async () => {
    if (!text.trim() || !user) return;
    setSending(true);
    const newMsg = {
      sender_email: user.email,
      sender_name: user.full_name || "You",
      role: "buyer",
      text: text.trim(),
      timestamp: new Date().toISOString(),
    };

    if (chat) {
      const updated = await apiClient.entities.ProductChat.update(chat.id, {
        messages: [...(chat.messages || []), newMsg],
        last_message_at: new Date().toISOString(),
        is_read_by_seller: false,
      });
      setChat(updated);
    } else {
      const created = await apiClient.entities.ProductChat.create({
        product_id: product.id,
        product_name: product.name,
        seller_id: product.seller_id || "",
        seller_name: product.seller_name || "Store",
        buyer_email: user.email,
        buyer_name: user.full_name || "Customer",
        messages: [newMsg],
        last_message_at: new Date().toISOString(),
        is_read_by_seller: false,
      });
      setChat(created);
    }
    setText("");
    setSending(false);
  };

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-2 border border-primary text-primary hover:bg-primary hover:text-white transition-colors px-4 py-2 rounded-lg text-sm font-medium w-full justify-center"
      >
        <MessageCircle className="w-4 h-4" />
        Chat with Seller
      </button>
    );
  }

  if (!user) {
    return (
      <div className="border border-border rounded-xl p-4 text-center text-sm text-muted-foreground">
        <MessageCircle className="w-6 h-6 mx-auto mb-2 text-primary" />
        <p className="mb-2">Please login to chat with the seller</p>
        <Button size="sm" onClick={() => apiClient.auth.redirectToLogin()}>Login</Button>
      </div>
    );
  }

  return (
    <div className="border border-border rounded-xl overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between bg-primary text-white px-4 py-2.5">
        <div className="flex items-center gap-2 text-sm font-semibold">
          <MessageCircle className="w-4 h-4" />
          Chat with {product.seller_name || "Seller"}
        </div>
        <button onClick={() => setOpen(false)}><X className="w-4 h-4" /></button>
      </div>

      {/* Messages */}
      <div className="h-56 overflow-y-auto p-3 space-y-2 bg-muted/20">
        {loading && <div className="flex justify-center py-6"><Loader2 className="w-5 h-5 animate-spin text-primary" /></div>}
        {!loading && (!chat?.messages?.length) && (
          <p className="text-xs text-muted-foreground text-center py-6">Send a message to ask about this product</p>
        )}
        {chat?.messages?.map((msg, i) => (
          <div key={i} className={`flex ${msg.role === "buyer" ? "justify-end" : "justify-start"}`}>
            <div className={`max-w-[80%] px-3 py-1.5 rounded-xl text-sm ${msg.role === "buyer" ? "bg-primary text-white" : "bg-white border border-border text-foreground"}`}>
              <p>{msg.text}</p>
              <p className={`text-[10px] mt-0.5 ${msg.role === "buyer" ? "text-white/70 text-right" : "text-muted-foreground"}`}>
                {new Date(msg.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
              </p>
            </div>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="flex gap-2 p-2 border-t border-border bg-white">
        <Input
          value={text}
          onChange={e => setText(e.target.value)}
          onKeyDown={e => e.key === "Enter" && handleSend()}
          placeholder="Type a message..."
          className="text-sm h-8"
        />
        <Button size="sm" onClick={handleSend} disabled={sending || !text.trim()} className="h-8 px-3 bg-primary hover:bg-primary/90">
          {sending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
        </Button>
      </div>
    </div>
  );
}

