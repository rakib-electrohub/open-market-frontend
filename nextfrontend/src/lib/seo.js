export function absoluteUrl(path = "/") {
  return new URL(path, process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000").toString();
}

export function productJsonLd(product) {
  return {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product?.name || "Product",
    description: product?.description || "",
    image: product?.image ? [absoluteUrl(product.image)] : undefined,
    offers: product?.price
      ? { "@type": "Offer", price: product.price, priceCurrency: product.currency || "BDT", availability: "https://schema.org/InStock" }
      : undefined,
  };
}