import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { apiClient } from "@/api/apiClient";
import { uploadImageWithSizeCheck } from "@/utils/imageUpload";
import { useToast } from "@/components/ui/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import { Store, CheckCircle, Loader2, ArrowRight, Shield, TrendingUp, Users, Camera } from "lucide-react";

const PERKS = [
  { icon: TrendingUp, title: "Grow Your Business", desc: "Reach thousands of customers across Bangladesh" },
  { icon: Shield, title: "Secure Payments", desc: "Get paid safely via bKash, Nagad, or bank transfer" },
  { icon: Users, title: "Dedicated Support", desc: "Our seller support team is available 7 days a week" },
];

export default function SellerRegister() {
  const [user, setUser] = useState(null);
  const [existing, setExisting] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [form, setForm] = useState({ store_name: "", store_description: "", phone: "", address: "" });
  const [logoFile, setLogoFile] = useState(null);
  const [logoPreview, setLogoPreview] = useState(null);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    apiClient.auth.me()
      .then(async (u) => {
        setUser(u);
        // Check if already applied
        const existing = await apiClient.entities.Seller.filter({ user_id: u.id }).catch(() => []);
        if (existing.length > 0) setExisting(existing[0]);
        setForm(f => ({ ...f, phone: u.phone || "", store_name: "" }));
        setLoading(false);
      })
      .catch(() => {
        apiClient.auth.redirectToLogin("/seller/register");
      });
  }, []);

  const handleLogoChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setLogoFile(file);
    setLogoPreview(URL.createObjectURL(file));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.store_name.trim()) { toast({ title: "Store name is required", variant: "destructive" }); return; }
    setSubmitting(true);
    let logoUrl = "";
    if (logoFile) {
      setUploadingLogo(true);
      try {
        const { file_url } = await uploadImageWithSizeCheck(logoFile, (message) => toast({ title: message, variant: 'destructive' }));
        logoUrl = file_url;
      } catch (error) {
        toast({ title: error.message || 'Logo upload failed', variant: 'destructive' });
        setUploadingLogo(false);
        setSubmitting(false);
        return;
      }
      setUploadingLogo(false);
    }
    await apiClient.entities.Seller.create({
      user_id: user.id,
      store_name: form.store_name,
      store_description: form.store_description,
      phone: form.phone,
      email: user.email,
      address: form.address,
      logo: logoUrl,
      status: "pending",
    });
    setSubmitting(false);
    setSubmitted(true);
  };

  if (loading) return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <Loader2 className="w-8 h-8 animate-spin text-primary" />
    </div>
  );

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="max-w-5xl mx-auto px-4 py-10">
        <div className="grid lg:grid-cols-2 gap-10 items-start">
          {/* Left — Info */}
          <div>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 bg-primary rounded-xl flex items-center justify-center">
                <Store className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="font-poppins font-bold text-2xl">Become a Seller</h1>
                <p className="text-muted-foreground text-sm">Join Open Market BD marketplace</p>
              </div>
            </div>
            <p className="text-muted-foreground mb-8 leading-relaxed">
              Start selling your products to thousands of customers across Bangladesh. 
              Apply today and our team will review your application within 24–48 hours.
            </p>
            <div className="space-y-4">
              {PERKS.map(({ icon: Icon, title, desc }) => (
                <div key={title} className="flex items-start gap-3 p-4 bg-white rounded-xl border border-border">
                  <div className="w-9 h-9 bg-primary/10 rounded-lg flex items-center justify-center flex-shrink-0">
                    <Icon className="w-4 h-4 text-primary" />
                  </div>
                  <div>
                    <p className="font-semibold text-sm">{title}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Right — Form */}
          <div className="bg-white rounded-2xl border border-border p-6 shadow-sm">
            {submitted ? (
              <div className="text-center py-8">
                <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
                <h2 className="font-poppins font-bold text-xl mb-2">Application Submitted!</h2>
                <p className="text-muted-foreground text-sm mb-6">
                  We'll review your application and notify you at <strong>{user?.email}</strong> within 24–48 hours.
                </p>
                <Link to="/account">
                  <Button className="bg-primary hover:bg-primary/90">Go to My Account</Button>
                </Link>
              </div>
            ) : existing ? (
              <div className="text-center py-8">
                <Store className="w-14 h-14 text-primary mx-auto mb-4" />
                <h2 className="font-poppins font-bold text-xl mb-2">Application {existing.status === "approved" ? "Approved!" : existing.status === "pending" ? "Under Review" : "Status: " + existing.status}</h2>
                {existing.status === "approved" ? (
                  <>
                    <p className="text-muted-foreground text-sm mb-6">Your store <strong>{existing.store_name}</strong> is live!</p>
                    <Link to="/seller/dashboard">
                      <Button className="bg-primary hover:bg-primary/90 gap-2">Go to Seller Dashboard <ArrowRight className="w-4 h-4" /></Button>
                    </Link>
                  </>
                ) : existing.status === "pending" ? (
                  <p className="text-muted-foreground text-sm">Your application for <strong>{existing.store_name}</strong> is being reviewed. We'll email you soon.</p>
                ) : (
                  <p className="text-muted-foreground text-sm">Your application status: <span className="font-semibold capitalize">{existing.status}</span>. Please contact support.</p>
                )}
              </div>
            ) : (
              <>
                <h2 className="font-poppins font-bold text-lg mb-5">Store Application</h2>
                <form onSubmit={handleSubmit} className="space-y-4">
                  {/* Logo Upload */}
                  <div className="flex flex-col items-center gap-2">
                    <label htmlFor="logo-upload" className="cursor-pointer group">
                      <div className="w-20 h-20 rounded-full border-2 border-dashed border-border group-hover:border-primary transition-colors overflow-hidden flex items-center justify-center bg-muted/30 relative">
                        {logoPreview ? (
                          <img src={logoPreview} alt="Logo" className="w-full h-full object-cover" />
                        ) : (
                          <div className="flex flex-col items-center">
                            <Camera className="w-6 h-6 text-muted-foreground" />
                            <span className="text-[10px] text-muted-foreground mt-1">Logo</span>
                          </div>
                        )}
                      </div>
                      <input id="logo-upload" type="file" accept="image/*" className="hidden" onChange={handleLogoChange} />
                    </label>
                    <p className="text-xs text-muted-foreground">Upload store logo (optional)</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium">Store Name <span className="text-destructive">*</span></Label>
                    <Input value={form.store_name} onChange={e => setForm({ ...form, store_name: e.target.value })}
                      placeholder="e.g. Dhaka Fashion House" className="mt-1" required />
                  </div>
                  <div>
                    <Label className="text-sm font-medium">Store Description</Label>
                    <textarea value={form.store_description} onChange={e => setForm({ ...form, store_description: e.target.value })}
                      placeholder="Tell customers what you sell..." rows={3}
                      className="w-full mt-1 border border-input rounded-md px-3 py-2 text-sm bg-transparent resize-none focus:outline-none focus:ring-1 focus:ring-ring" />
                  </div>
                  <div>
                    <Label className="text-sm font-medium">Phone Number <span className="text-destructive">*</span></Label>
                    <Input value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })}
                      placeholder="01XXXXXXXXX" className="mt-1" required />
                  </div>
                  <div>
                    <Label className="text-sm font-medium">Business Address</Label>
                    <Input value={form.address} onChange={e => setForm({ ...form, address: e.target.value })}
                      placeholder="Street, Area, District" className="mt-1" />
                  </div>
                  <Button type="submit" disabled={submitting || uploadingLogo} className="w-full bg-primary hover:bg-primary/90 gap-2">
                    {(submitting || uploadingLogo) ? <><Loader2 className="w-4 h-4 animate-spin" /> {uploadingLogo ? "Uploading logo..." : "Submitting..."}</> : <>Submit Application <ArrowRight className="w-4 h-4" /></>}
                  </Button>
                  <p className="text-xs text-muted-foreground text-center">
                    By applying, you agree to our <Link to="/policy/terms" className="text-primary hover:underline">Seller Terms</Link>
                  </p>
                </form>
              </>
            )}
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}

