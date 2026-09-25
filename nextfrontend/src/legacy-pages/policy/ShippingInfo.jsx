import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import RichTextRenderer from "@/components/RichTextRenderer";
import { ArrowLeft, Truck, Clock, MapPin, Package } from "lucide-react";
import { Link } from "@/lib/next-router";
import { useAppSettings } from "@/hooks/useAppSettings";

const defaultZones = [
  { zone: "Dhaka City", time: "Same Day / Next Day", fee: "Free above ৳500, else ৳60" },
  { zone: "Dhaka Division", time: "1–2 Business Days", fee: "৳80" },
  { zone: "Chittagong, Sylhet", time: "2–3 Business Days", fee: "৳100" },
  { zone: "Other Divisions", time: "3–5 Business Days", fee: "৳120" },
  { zone: "Remote Areas", time: "5–7 Business Days", fee: "৳150" },
];

const flattenDeliveryLocations = (locations) => {
  if (!locations?.divisions?.length) return [];

  const zones = [];
  locations.divisions.forEach((division) => {
    (division.districts || []).forEach((district) => {
      if (district.areas?.length) {
        district.areas.forEach((area) => {
          zones.push({
            zone: `${division.name} / ${district.name} / ${area.name}`,
            fee: area.default_fee != null ? `৳${area.default_fee}` : "-",
            fast_fee: area.fast_fee != null ? `৳${area.fast_fee}` : null,
          });
        });
      } else {
        zones.push({
          zone: `${division.name} / ${district.name}`,
          fee: district.default_fee != null ? `৳${district.default_fee}` : "-",
          fast_fee: district.fast_fee != null ? `৳${district.fast_fee}` : null,
        });
      }
    });
  });

  if (locations.unknown_area_fee) {
    zones.push({
      zone: "Unknown / Remote Area",
      fee: locations.unknown_area_fee.default_fee != null ? `৳${locations.unknown_area_fee.default_fee}` : "-",
      fast_fee: locations.unknown_area_fee.fast_fee != null ? `৳${locations.unknown_area_fee.fast_fee}` : null,
    });
  }

  return zones;
};

export default function ShippingInfo() {
  const settings = useAppSettings();
  let parsedZones = defaultZones;
  try {
    const locations = settings.delivery_locations_json ? JSON.parse(settings.delivery_locations_json) : null;
    const zonesFromSettings = flattenDeliveryLocations(locations);
    if (zonesFromSettings.length) parsedZones = zonesFromSettings;
  } catch (error) {
    parsedZones = defaultZones;
  }

  const shippingText = settings.shipping_info || "We deliver across Bangladesh with flexible delivery options and area-based shipping charges.";

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="max-w-3xl mx-auto px-4 py-10">
        <Link to="/" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-primary mb-6">
          <ArrowLeft className="w-4 h-4" /> Back to Home
        </Link>
        <div className="bg-white rounded-2xl border border-border p-8">
          <h1 className="font-poppins font-bold text-3xl mb-2">Shipping Information</h1>
          <p className="text-muted-foreground text-sm mb-8">Everything you need to know about delivery</p>

          <div className="mb-8">
            <RichTextRenderer content={shippingText} className="text-sm leading-relaxed text-muted-foreground" />
          </div>

          <h2 className="font-semibold text-base mb-3">Delivery Zones & Fees</h2>
          <div className="rounded-xl border border-border overflow-hidden mb-6">
            <table className="w-full text-sm">
              <thead className="bg-muted/30">
                <tr>
                  <th className="text-left px-4 py-2.5 text-xs font-semibold text-muted-foreground">Area</th>
                  <th className="text-left px-4 py-2.5 text-xs font-semibold text-muted-foreground">Default Fee</th>
                  <th className="text-left px-4 py-2.5 text-xs font-semibold text-muted-foreground">Fast Fee</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {parsedZones.map((zone) => (
                  <tr key={zone.zone}>
                    <td className="px-4 py-2.5 font-medium">{zone.zone}</td>
                    <td className="px-4 py-2.5 text-muted-foreground">{zone.fee}</td>
                    <td className="px-4 py-2.5 text-muted-foreground">{zone.fast_fee || "N/A"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="space-y-4 text-sm">
            <section>
              <h2 className="font-semibold text-base mb-2">Fast Delivery</h2>
              <p className="text-muted-foreground">Select the fast delivery option in checkout to receive your order sooner when available in your area.</p>
            </section>
            <section>
              <h2 className="font-semibold text-base mb-2">Failed Delivery</h2>
              <p className="text-muted-foreground">If delivery fails (no one available), our courier will attempt re-delivery up to two more times. After 3 failed attempts, the order may be returned and a refund processed.</p>
            </section>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}