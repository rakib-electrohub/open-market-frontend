import { useContext } from "react";
import { Link } from "@/lib/next-router";
import { Facebook, Instagram, Youtube, Twitter, Phone, Mail, MapPin } from "lucide-react";
import { useAppSettings } from "@/hooks/useAppSettings";
import { StoreChromeContext } from "@/components/layout/StoreChromeContext";

export default function Footer({ persistent = false }) {
  const storeChrome = useContext(StoreChromeContext);
  if (storeChrome && !persistent) return null;
  return <FooterContent />;
}

function FooterContent() {
  const settings = useAppSettings();
  
  const contactPhone = settings.contact_phone || "+880 1700-000000";
  const contactEmail = settings.contact_email || "support@openmarketbd.com";
  const contactAddress = settings.contact_address || "Dhaka, Bangladesh";
  const facebookUrl = settings.facebook_url || "#";
  const instagramUrl = settings.instagram_url || "#";
  const youtubeUrl = settings.youtube_url || "#";
  const twitterUrl = settings.twitter_url || "#";
  const storeName = settings.store_name || "Open Market";
  const storeTagline = settings.store_tagline || "Bangladesh's Modern Marketplace";

  return (
    <footer className="bg-gray-900 text-gray-300">
      <div className="max-w-7xl mx-auto px-4 py-12">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
          {/* Brand */}
          <div>
            <div className="flex items-center gap-2 mb-4">
              <div className="w-9 h-9 bg-primary rounded-lg flex items-center justify-center">
                <span className="text-white font-poppins font-black text-sm">OM</span>
              </div>
              <div>
                <div className="font-poppins font-bold text-white text-lg leading-none">{storeName}</div>
                <div className="font-poppins text-[10px] text-primary font-semibold tracking-widest uppercase">Bangladesh</div>
              </div>
            </div>
            <p className="text-sm text-gray-400 mb-4 leading-relaxed">
              {storeTagline}
            </p>
            <div className="flex gap-3">
              {[
                { icon: Facebook, url: facebookUrl },
                { icon: Instagram, url: instagramUrl },
                { icon: Youtube, url: youtubeUrl },
                { icon: Twitter, url: twitterUrl }
              ].map(({ icon: Icon, url }, i) => (
                <a key={i} href={url} target="_blank" rel="noopener noreferrer" className="w-8 h-8 bg-gray-800 rounded-full flex items-center justify-center hover:bg-primary transition-colors">
                  <Icon className="w-4 h-4" />
                </a>
              ))}
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h3 className="font-poppins font-semibold text-white mb-4">Quick Links</h3>
            <ul className="space-y-2 text-sm">
              {[["Home", "/"], ["Products", "/products"], ["Flash Sales", "/flash-sales"], ["My Orders", "/orders"], ["Wishlist", "/wishlist"], ["Contact", "/contact"]].map(([label, href]) => (
                <li key={label}><Link to={href} className="hover:text-primary transition-colors">{label}</Link></li>
              ))}
            </ul>
          </div>

          {/* Customer Service */}
          <div>
            <h3 className="font-poppins font-semibold text-white mb-4">Customer Service</h3>
            <ul className="space-y-2 text-sm">
              {[["Customer Reviews", "/customer-reviews"], ["Return Policy", "/policy/return"], ["Privacy Policy", "/policy/privacy"], ["Terms & Conditions", "/policy/terms"], ["Shipping Info", "/policy/shipping"], ["FAQs", "/faq"], ["Become a Seller", "/seller/register"]].map(([label, href]) => (
                <li key={label}><Link to={href} className="hover:text-primary transition-colors">{label}</Link></li>
              ))}
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h3 className="font-poppins font-semibold text-white mb-4">Contact Us</h3>
            <div className="space-y-3 text-sm">
              <div className="flex items-start gap-2">
                <MapPin className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
                <span className="text-gray-400">{contactAddress}</span>
              </div>
              <div className="flex items-center gap-2">
                <Phone className="w-4 h-4 text-primary flex-shrink-0" />
                <a href={`tel:${contactPhone.replace(/\s+/g, '')}`} className="text-gray-400 hover:text-primary transition-colors">{contactPhone}</a>
              </div>
              <div className="flex items-center gap-2">
                <Mail className="w-4 h-4 text-primary flex-shrink-0" />
                <a href={`mailto:${contactEmail}`} className="text-gray-400 hover:text-primary transition-colors">{contactEmail}</a>
              </div>
            </div>
            <div className="mt-4">
              <p className="text-xs text-gray-500 mb-2">We Accept</p>
              <div className="flex gap-2 flex-wrap">
                {["bKash", "Nagad", "Rocket", "COD", "Card"].map((p) => (
                  <span key={p} className="px-2 py-0.5 bg-gray-800 rounded text-xs text-gray-300">{p}</span>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
      <div className="border-t border-gray-800 py-4 text-center text-xs text-gray-500">
        © 2024 {storeName}. All rights reserved. Made with ❤️ in Bangladesh.
      </div>
    </footer>
  );
}