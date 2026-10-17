"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { Facebook, MessageCircle, Phone, X } from "lucide-react";
import { useAppSettings } from "@/hooks/useAppSettings";
import { getSafeHttpUrl } from "@/utils/urls";

const digitsOnly = (value) => String(value || "").replace(/\D/g, "");

export default function StoreContactButton() {
  const settings = useAppSettings();
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);
  const [position, setPosition] = useState(null);
  const [viewportWidth, setViewportWidth] = useState(0);
  const dragState = useRef(null);
  const dragged = useRef(false);

  useEffect(() => {
    const updateViewportWidth = () => setViewportWidth(window.innerWidth);
    updateViewportWidth();
    window.addEventListener("resize", updateViewportWidth);
    return () => window.removeEventListener("resize", updateViewportWidth);
  }, []);

  const phoneNumber = String(settings.contact_phone || "").trim();
  const phoneHref = phoneNumber ? `tel:${phoneNumber.replace(/[^\d+]/g, "")}` : "";
  const whatsappNumber = digitsOnly(settings.whatsapp_number);
  const whatsappHref = getSafeHttpUrl(settings.whatsapp_url)
    || (whatsappNumber ? `https://wa.me/${whatsappNumber}` : "");
  const imoNumber = String(settings.imo_number || "").trim();
  const imoHref = getSafeHttpUrl(settings.imo_url);
  const facebookHref = getSafeHttpUrl(settings.facebook_messenger_url);
  const panelAlignsLeft = position
    ? position.x < viewportWidth / 2
    : false;
  const panelOpensDown = position?.y < 280;

  const channels = [
    phoneHref && {
      label: "Call us",
      detail: phoneNumber,
      href: phoneHref,
      icon: Phone,
    },
    whatsappHref && {
      label: "WhatsApp",
      detail: settings.whatsapp_number || "",
      href: whatsappHref,
      icon: MessageCircle,
    },
    imoHref && {
      label: "IMO",
      detail: imoNumber,
      href: imoHref,
      icon: MessageCircle,
    },
    facebookHref && {
      label: "Facebook Messenger",
      detail: "",
      href: facebookHref,
      icon: Facebook,
    },
  ].filter(Boolean);

  const startDrag = (event) => {
    if (event.button !== 0) return;
    const bounds = event.currentTarget.getBoundingClientRect();
    dragState.current = {
      pointerId: event.pointerId,
      offsetX: event.clientX - bounds.left,
      offsetY: event.clientY - bounds.top,
      startX: event.clientX,
      startY: event.clientY,
      moved: false,
    };
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const moveButton = (event) => {
    const drag = dragState.current;
    if (!drag || drag.pointerId !== event.pointerId) return;

    if (!drag.moved && Math.hypot(event.clientX - drag.startX, event.clientY - drag.startY) < 5) return;
    drag.moved = true;
    dragged.current = true;

    setPosition({
      x: Math.max(8, Math.min(window.innerWidth - 64, event.clientX - drag.offsetX)),
      y: Math.max(8, Math.min(window.innerHeight - 64, event.clientY - drag.offsetY)),
    });
  };

  const endDrag = (event) => {
    if (dragState.current?.pointerId !== event.pointerId) return;
    dragState.current = null;
    window.setTimeout(() => {
      dragged.current = false;
    }, 0);
  };

  return (
    <div
      className={position
        ? "fixed z-[60]"
        : `fixed right-4 z-[60] ${pathname.startsWith("/product/") ? "bottom-20" : "bottom-4"}`}
      style={position ? { left: position.x, top: position.y } : undefined}
    >
      {isOpen && (
        <section
          aria-label="Contact options"
          className={`absolute w-72 max-w-[calc(100vw-2rem)] rounded-2xl border border-border bg-white p-4 shadow-xl ${
            panelOpensDown ? "top-full mt-3" : "bottom-full mb-3"
          } ${panelAlignsLeft ? "left-0" : "right-0"
          }`}
        >
          <div className="mb-3">
            <h2 className="font-semibold text-foreground">Contact us</h2>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Available {settings.contact_hours || "09:00 AM to 10:00 PM"}
            </p>
          </div>
          <div className="space-y-2">
            {channels.map(({ label, detail, href, icon: Icon }) => (
              <a
                key={label}
                href={href}
                target={href.startsWith("tel:") ? undefined : "_blank"}
                rel={href.startsWith("tel:") ? undefined : "noopener noreferrer"}
                className="flex items-center gap-3 rounded-xl border border-border px-3 py-2.5 text-sm text-foreground transition-colors hover:border-primary/40 hover:bg-primary/5"
              >
                <Icon className="h-4 w-4 shrink-0 text-primary" />
                <span className="min-w-0">
                  <span className="block font-medium">{label}</span>
                  {detail && <span className="block truncate text-xs text-muted-foreground">{detail}</span>}
                </span>
              </a>
            ))}
            {channels.length === 0 && (
              <p className="text-sm text-muted-foreground">Contact details are not available right now.</p>
            )}
          </div>
        </section>
      )}
      <button
        type="button"
        aria-label={isOpen ? "Close contact options" : "Open contact options"}
        aria-expanded={isOpen}
        onPointerDown={startDrag}
        onPointerMove={moveButton}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
        onClick={() => {
          if (dragged.current) return;
          setIsOpen((open) => !open);
        }}
        className="flex h-14 w-14 touch-none items-center justify-center rounded-full bg-primary text-white shadow-xl transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
      >
        {isOpen ? <X className="h-6 w-6" /> : <MessageCircle className="h-6 w-6" />}
      </button>
    </div>
  );
}
