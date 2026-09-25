import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import RichTextRenderer from "@/components/RichTextRenderer";
import { ArrowLeft } from "lucide-react";
import { Link } from "react-router-dom";
import { useAppSettings } from "@/hooks/useAppSettings";

export default function Terms() {
  const settings = useAppSettings();
  const content = settings.terms_conditions || "By using Open Market BD, you agree to our terms and conditions. Please review the terms carefully before placing an order.";

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="max-w-3xl mx-auto px-4 py-10">
        <Link to="/" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-primary mb-6">
          <ArrowLeft className="w-4 h-4" /> Back to Home
        </Link>
        <div className="bg-white rounded-2xl border border-border p-8">
          <h1 className="font-poppins font-bold text-3xl mb-2">Terms & Conditions</h1>
          <p className="text-muted-foreground text-sm mb-8">Last updated: January 2024</p>
          <RichTextRenderer content={content} className="text-sm leading-relaxed text-muted-foreground" />
        </div>
      </main>
      <Footer />
    </div>
  );
}