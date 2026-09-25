import "./globals.css";

export const metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"),
  title: { default: "Open Market", template: "%s | Open Market" },
  description: "Discover products from trusted sellers on Open Market.",
  applicationName: "Open Market",
  robots: { index: true, follow: true },
  openGraph: {
    type: "website",
    siteName: "Open Market",
    title: "Open Market",
    description: "Discover products from trusted sellers on Open Market.",
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>{children}</body>
    </html>
  );
}
