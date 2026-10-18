export const SITE_NAME = "Open Market";
export const SITE_DESCRIPTION = "Discover products from trusted sellers on Open Market.";
export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000").replace(/\/$/, "");
export const DEFAULT_OG_IMAGE = `${SITE_URL}/og-default.svg`;

export function absoluteUrl(path = "/") {
  const safePath = path && path.startsWith("/") ? path : `/${path || ""}`;
  return new URL(safePath, SITE_URL).toString().replace(/\/$/, "") || SITE_URL;
}

export function stripHtml(value = "") {
  return String(value || "")
    .replace(/<[^>]*>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function truncateText(value = "", maxLength = 160) {
  const clean = stripHtml(value);
  if (!clean) return "";
  return clean.length <= maxLength ? clean : `${clean.slice(0, maxLength - 1).trimEnd()}…`;
}

export function buildPageMetadata({
  title,
  description,
  path = "/",
  noindex = false,
  nofollow,
  openGraphTitle,
  openGraphDescription,
  image = DEFAULT_OG_IMAGE,
  twitterHandle = "@openmarket",
  type = "website",
  keywords,
}) {
  const pageTitle = title || SITE_NAME;
  const pageDescription = description || SITE_DESCRIPTION;
  const follow = nofollow === undefined ? !noindex : !nofollow;

  return {
    title: pageTitle,
    description: pageDescription,
    keywords,
    alternates: { canonical: absoluteUrl(path) },
    robots: { index: !noindex, follow },
    openGraph: {
      type,
      url: absoluteUrl(path),
      title: openGraphTitle || pageTitle,
      description: openGraphDescription || pageDescription,
      siteName: SITE_NAME,
      images: [{ url: image, width: 1200, height: 630, alt: openGraphTitle || pageTitle }],
    },
    twitter: {
      card: "summary_large_image",
      site: twitterHandle,
      title: openGraphTitle || pageTitle,
      description: openGraphDescription || pageDescription,
      images: [image],
    },
  };
}

export function productJsonLd(product, seller) {
  const productImages = Array.isArray(product?.images) ? product.images.filter(Boolean) : [];
  const imageList = productImages.length ? productImages : [product?.image || DEFAULT_OG_IMAGE];
  const productUrl = product?.id ? absoluteUrl(`/product/${product.id}`) : absoluteUrl("/products");

  return {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product?.name || "Product",
    description: truncateText(product?.short_description || product?.description || SITE_DESCRIPTION, 220),
    sku: product?.sku || product?.id || "",
    brand: product?.brand ? { "@type": "Brand", name: product.brand } : undefined,
    category: product?.main_category || product?.category || "General",
    image: imageList,
    offers: {
      "@type": "Offer",
      url: productUrl,
      priceCurrency: "BDT",
      price: String(Number(product?.price || 0)),
      availability: Number(product?.stock || 0) > 0 ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
      itemCondition: "https://schema.org/NewCondition",
    },
    ...(seller ? { seller: { "@type": "Store", name: seller.store_name || "Open Market Seller", url: seller?.id ? absoluteUrl(`/store/${seller.id}`) : absoluteUrl("/products") } } : {}),
    ...(product?.average_rating || product?.review_count ? { aggregateRating: { "@type": "AggregateRating", ratingValue: Number(product?.average_rating || 0), reviewCount: Number(product?.review_count || 0) } } : {}),
  };
}

export function buildBreadcrumbSchema(items = []) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      item: item.url,
    })),
  };
}

export function buildWebsiteSchema() {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: SITE_NAME,
    url: SITE_URL,
    description: SITE_DESCRIPTION,
    potentialAction: {
      "@type": "SearchAction",
      target: `${SITE_URL}/products?search={search_term_string}`,
      "query-input": "required name=search_term_string",
    },
  };
}

export function buildOrganizationSchema(settings = {}) {
  const sameAs = [settings.facebook_url, settings.instagram_url, settings.youtube_url]
    .map((value) => {
      try {
        const url = new URL(String(value || ""));
        return url.protocol === "http:" || url.protocol === "https:" ? url.toString() : null;
      } catch {
        return null;
      }
    })
    .filter(Boolean);

  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: SITE_NAME,
    url: SITE_URL,
    logo: `${SITE_URL}/og-default.svg`,
    ...(sameAs.length ? { sameAs } : {}),
  };
}

export function buildCollectionPageSchema({ name, description, url, itemCount }) {
  return {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name,
    description,
    url,
    mainEntity: {
      "@type": "ItemList",
      name,
      ...(Number.isFinite(itemCount) ? { numberOfItems: itemCount } : {}),
    },
  };
}

export function getCategorySeoData(categoryName, productCount = 0) {
  const safeName = categoryName || "Products";
  const title = safeName === "Products" ? "All Products | Open Market" : `${safeName} | Open Market`;
  const baseDescription = safeName === "Products"
    ? "Explore curated products across trusted categories on Open Market."
    : `Browse ${safeName} products and discover trusted picks from verified sellers on Open Market.`;

  return {
    title,
    description: `${baseDescription} ${productCount ? `Discover ${productCount} curated items from verified sellers.` : "Find quality options and competitive offers across the marketplace."}`,
    heading: safeName === "Products" ? "Shop all products" : safeName,
    intro: safeName === "Products"
      ? "Discover top-selling products from trusted sellers and fresh marketplace picks across categories."
      : `Browse curated ${safeName.toLowerCase()} items from trusted sellers with strong value, quality, and fast delivery.`,
    focus: safeName === "Products"
      ? ["Trending picks", "Top-rated sellers", "Daily deals"]
      : ["Curated picks", "Verified sellers", "Fast delivery"],
  };
}

export function getSellerSeoData(seller = {}, productCount = 0) {
  const storeName = seller?.store_name || "Seller Store";
  const summary = seller?.store_description || `Shop ${storeName} on Open Market for quality products, trusted service, and value-packed deals.`;

  return {
    title: `${storeName} | Open Market`,
    description: `${summary} Explore ${productCount} products from ${storeName} and buy confidently from a verified marketplace seller.`,
    heading: `Welcome to ${storeName}`,
    intro: summary,
    badges: ["Verified seller", "Trusted products", "Marketplace support"],
  };
}

export function buildSellerStoreSchema(seller, products = []) {
  const sellerProducts = Array.isArray(products) ? products : [];
  const ratingCount = sellerProducts.reduce((sum, product) => sum + Number(product?.review_count || 0), 0);
  const avgRating = sellerProducts.length
    ? sellerProducts.reduce((sum, product) => sum + Number(product?.average_rating || 0), 0) / sellerProducts.length
    : 0;

  return {
    "@context": "https://schema.org",
    "@type": "Store",
    name: seller?.store_name || "Seller Store",
    description: seller?.store_description || `${seller?.store_name || "Seller"} products on Open Market.`,
    url: seller?.id ? absoluteUrl(`/store/${seller.id}`) : absoluteUrl("/products"),
    image: seller?.logo || DEFAULT_OG_IMAGE,
    address: seller?.address ? { "@type": "PostalAddress", streetAddress: seller.address } : undefined,
    telephone: seller?.phone || undefined,
    aggregateRating: sellerProducts.length
      ? { "@type": "AggregateRating", ratingValue: Number(avgRating || 0), reviewCount: Number(ratingCount || 0) }
      : undefined,
    areaServed: "BD",
  };
}