export default function robots() {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
  return { rules: [{ userAgent: "*", allow: "/", disallow: ["/admin/", "/seller/", "/staff/", "/account", "/orders", "/wishlist", "/checkout"] }], sitemap: `${baseUrl}/sitemap.xml` };
}