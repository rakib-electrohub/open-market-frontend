import { useState } from "react";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Phone, Mail, MapPin, Clock, Send, MessageSquare, Facebook, Instagram, Youtube } from "lucide-react";
import { apiClient } from "@/api/apiClient";
import { toast } from "sonner";
import { useAppSettings } from "@/hooks/useAppSettings";

export default function Contact() {
  const settings = useAppSettings();
  const [form, setForm] = useState({ name: "", email: "", phone: "", subject: "", message: "" });
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  // Extract settings with fallbacks
  const contactPhone = settings.contact_phone || "+880 1700-000000";
  const contactEmail = settings.contact_email || "support@openmarketbd.com";
  const contactAddress = settings.contact_address || "Dhaka, Bangladesh";
  const facebookUrl = settings.facebook_url || "#";
  const instagramUrl = settings.instagram_url || "#";
  const youtubeUrl = settings.youtube_url || "#";

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name || !form.email || !form.message) {
      toast.error("Please fill in all required fields.");
      return;
    }
    setSending(true);
    await apiClient.entities.ContactMessage.create({ ...form, status: "new" });
    setSending(false);
    setSent(true);
    toast.success("Message sent! We'll get back to you soon.");
    setForm({ name: "", email: "", phone: "", subject: "", message: "" });
  };

  const contactInfo = [
    {
      icon: Phone,
      label: "Phone / WhatsApp",
      value: contactPhone,
      sub: "Available 9am – 9pm, 7 days",
      href: `tel:${contactPhone.replace(/\s+/g, '')}`,
      color: "text-green-600",
      bg: "bg-green-50",
    },
    {
      icon: Mail,
      label: "Email Support",
      value: contactEmail,
      sub: "Reply within 24 hours",
      href: `mailto:${contactEmail}`,
      color: "text-primary",
      bg: "bg-primary/10",
    },
    {
      icon: MapPin,
      label: "Office Address",
      value: contactAddress,
      sub: "Mon – Fri, 10am – 6pm",
      href: null,
      color: "text-blue-600",
      bg: "bg-blue-50",
    },
    {
      icon: Clock,
      label: "Business Hours",
      value: "9:00 AM – 9:00 PM",
      sub: "All 7 days of the week",
      href: null,
      color: "text-orange-600",
      bg: "bg-orange-50",
    },
  ];

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Navbar />

      {/* Hero */}
      <div className="bg-gradient-to-r from-primary to-orange-500 text-white py-12 px-4 text-center">
        <div className="max-w-2xl mx-auto">
          <div className="w-14 h-14 bg-white/20 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <MessageSquare className="w-7 h-7 text-white" />
          </div>
          <h1 className="font-poppins font-bold text-3xl md:text-4xl mb-2">Contact Us</h1>
          <p className="text-white/80 text-sm md:text-base">
            Have a question, complaint, or just want to say hello? We're here for you.
          </p>
        </div>
      </div>

      <div className="flex-1 max-w-6xl mx-auto w-full px-4 py-10 grid grid-cols-1 lg:grid-cols-2 gap-10">

        {/* Left: Contact Info */}
        <div className="space-y-6">
          <div>
            <h2 className="font-poppins font-bold text-xl mb-1">Get in Touch</h2>
            <p className="text-muted-foreground text-sm">We typically respond within 24 hours on all channels.</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {contactInfo.map(({ icon: Icon, label, value, sub, href, color, bg }) => (
              <div key={label} className="bg-white rounded-xl border border-border p-4 flex gap-3 items-start">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${bg}`}>
                  <Icon className={`w-5 h-5 ${color}`} />
                </div>
                <div>
                  <div className="text-xs text-muted-foreground font-medium mb-0.5">{label}</div>
                  {href ? (
                    <a href={href} className={`text-sm font-semibold hover:underline ${color}`}>{value}</a>
                  ) : (
                    <div className="text-sm font-semibold text-foreground">{value}</div>
                  )}
                  <div className="text-xs text-muted-foreground mt-0.5">{sub}</div>
                </div>
              </div>
            ))}
          </div>

          {/* Social */}
          <div className="bg-white rounded-xl border border-border p-5">
            <h3 className="font-poppins font-semibold text-sm mb-3">Follow Us</h3>
            <div className="flex gap-3">
              {[
                { icon: Facebook, label: "Facebook", url: facebookUrl, color: "text-blue-600 bg-blue-50 hover:bg-blue-600" },
                { icon: Instagram, label: "Instagram", url: instagramUrl, color: "text-pink-600 bg-pink-50 hover:bg-pink-600" },
                { icon: Youtube, label: "YouTube", url: youtubeUrl, color: "text-red-600 bg-red-50 hover:bg-red-600" },
              ].map(({ icon: Icon, label, url, color }) => (
                <a
                  key={label}
                  href={url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors hover:text-white ${color}`}
                >
                  <Icon className="w-4 h-4" /> {label}
                </a>
              ))}
            </div>
          </div>

          {/* FAQ hint */}
          <div className="bg-primary/5 border border-primary/20 rounded-xl p-4 text-sm text-primary flex items-start gap-2">
            <MessageSquare className="w-4 h-4 mt-0.5 flex-shrink-0" />
            <span>Before writing, check our <a href="/faq" className="font-semibold underline">FAQ page</a> — your question might already be answered there.</span>
          </div>
        </div>

        {/* Right: Contact Form */}
        <div className="bg-white rounded-2xl border border-border p-6 md:p-8 shadow-sm">
          <h2 className="font-poppins font-bold text-xl mb-1">Send a Message</h2>
          <p className="text-muted-foreground text-sm mb-6">Fill in the form and we'll respond as soon as possible.</p>

          {sent ? (
            <div className="text-center py-10">
              <div className="w-16 h-16 bg-green-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <Send className="w-8 h-8 text-green-600" />
              </div>
              <h3 className="font-poppins font-bold text-lg mb-2">Message Sent!</h3>
              <p className="text-muted-foreground text-sm mb-4">Thank you for reaching out. We'll get back to you within 24 hours.</p>
              <Button variant="outline" onClick={() => setSent(false)}>Send Another</Button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-1 block">Full Name *</label>
                  <Input
                    placeholder="Your name"
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-1 block">Email *</label>
                  <Input
                    type="email"
                    placeholder="your@email.com"
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-1 block">Phone (optional)</label>
                  <Input
                    placeholder="+880 1XXX-XXXXXX"
                    value={form.phone}
                    onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-1 block">Subject</label>
                  <Input
                    placeholder="What is this about?"
                    value={form.subject}
                    onChange={(e) => setForm({ ...form, subject: e.target.value })}
                  />
                </div>
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Message *</label>
                <textarea
                  className="w-full min-h-[130px] rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring resize-none"
                  placeholder="Describe your issue or question in detail..."
                  value={form.message}
                  onChange={(e) => setForm({ ...form, message: e.target.value })}
                />
              </div>
              <Button type="submit" className="w-full bg-primary hover:bg-primary/90 gap-2" disabled={sending}>
                {sending ? (
                  <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Sending...</>
                ) : (
                  <><Send className="w-4 h-4" /> Send Message</>
                )}
              </Button>
            </form>
          )}
        </div>
      </div>

      <Footer />
    </div>
  );
}

