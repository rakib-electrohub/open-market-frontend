import "./globals.css";

export const metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"),
  applicationName: "Open Market",
  title: { default: "Open Market", template: "%s | Open Market" },
  description: "Discover products from trusted sellers on Open Market.",
  keywords: ["online marketplace", "shopping bd", "trusted sellers", "electronics", "fashion", "home essentials"],
  alternates: { canonical: "/" },
  robots: { index: true, follow: true },
  openGraph: {
    type: "website",
    siteName: "Open Market",
    title: "Open Market",
    description: "Discover products from trusted sellers on Open Market.",
    url: process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000",
    images: [{ url: "/og-default.svg", width: 1200, height: 630, alt: "Open Market" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Open Market",
    description: "Discover products from trusted sellers on Open Market.",
    images: ["/og-default.svg"],
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>{children}</body>
    </html>
  );
}
