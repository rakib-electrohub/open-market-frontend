import { useState, useEffect } from "react";
import { apiClient } from "@/api/apiClient";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import RichTextRenderer from "@/components/RichTextRenderer";
import { ArrowLeft, ChevronDown } from "lucide-react";
import { Link } from "react-router-dom";

function FAQItem({ q, a }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border-b border-border last:border-0">
      <button onClick={() => setOpen(!open)} className="w-full flex items-center justify-between py-4 text-left gap-4">
        <span className="font-medium text-sm">{q}</span>
        <ChevronDown className={`w-4 h-4 text-muted-foreground flex-shrink-0 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      {open && <RichTextRenderer content={a} className="text-sm text-muted-foreground pb-4 leading-relaxed" />}
    </div>
  );
}

export default function FAQ() {
  const [faqs, setFaqs] = useState([]);

  useEffect(() => {
    apiClient.entities.FAQ.filter({ is_active: true }, "sort_order", 100).then(setFaqs).catch(() => setFaqs([]));
  }, []);

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="max-w-2xl mx-auto px-4 py-10">
        <Link to="/" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-primary mb-6">
          <ArrowLeft className="w-4 h-4" /> Back to Home
        </Link>
        <div className="bg-white rounded-2xl border border-border p-8">
          <h1 className="font-poppins font-bold text-3xl mb-2">Frequently Asked Questions</h1>
          <p className="text-muted-foreground text-sm mb-8">Find answers to common questions below.</p>
          <div>
            {faqs.map((f) => <FAQItem key={f.id} q={f.question} a={f.answer} />)}
            {faqs.length === 0 && <p className="text-muted-foreground text-sm text-center py-6">No FAQs available yet.</p>}
          </div>
          <div className="mt-8 bg-muted/30 rounded-xl p-5 text-center">
            <p className="font-semibold mb-1">Still have questions?</p>
            <p className="text-sm text-muted-foreground mb-3">Our support team is available 9 AM – 9 PM, 7 days a week.</p>
            <Link to="/contact" className="inline-flex items-center gap-2 bg-primary text-white text-sm font-semibold px-5 py-2 rounded-lg hover:bg-primary/90 transition-colors">Contact Support</Link>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}

