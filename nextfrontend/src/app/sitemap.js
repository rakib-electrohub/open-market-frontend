const publicRoutes = ["/", "/products", "/cart", "/checkout", "/contact", "/flash-sales", "/faq", "/policy/return", "/policy/privacy", "/policy/terms", "/policy/shipping"];

export default function sitemap() {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
  return publicRoutes.map((path) => ({ url: `${baseUrl}${path}`, changeFrequency: "daily", priority: path === "/" ? 1 : 0.7 }));
}