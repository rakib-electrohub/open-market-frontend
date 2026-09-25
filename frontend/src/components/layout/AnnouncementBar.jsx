import { useState, useEffect, useRef } from "react";
import { apiClient } from "@/api/apiClient";

export default function AnnouncementBar() {
  const [messages, setMessages] = useState([]);
  const [current, setCurrent] = useState(0);
  const [visible, setVisible] = useState(true);
  const intervalRef = useRef(null);

  useEffect(() => {
    apiClient.entities.SiteSettings.filter({ key: "announcement_text" })
      .then(results => {
        if (results.length && results[0].value) {
          const msgs = results[0].value.split("|").map(m => m.trim()).filter(Boolean);
          setMessages(msgs);
        }
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (messages.length <= 1) return;
    intervalRef.current = setInterval(() => {
      setVisible(false);
      setTimeout(() => {
        setCurrent(c => (c + 1) % messages.length);
        setVisible(true);
      }, 400);
    }, 4000);
    return () => clearInterval(intervalRef.current);
  }, [messages]);

  if (!messages.length) return null;

  return (
    <div className="bg-primary text-primary-foreground text-center text-xs font-medium py-2 px-4 overflow-hidden">
      <span
        className="inline-block transition-all duration-400"
        style={{ opacity: visible ? 1 : 0, transform: visible ? "translateY(0)" : "translateY(-6px)", transition: "opacity 0.4s, transform 0.4s" }}
      >
        {messages[current]}
      </span>
    </div>
  );
}

