import { useEffect } from "react";

const upsertMeta = (attribute, key, content) => {
  if (!content) return;
  let element = document.head.querySelector(`meta[${attribute}="${key}"]`);
  if (!element) {
    element = document.createElement("meta");
    element.setAttribute(attribute, key);
    document.head.appendChild(element);
  }
  element.setAttribute("content", content);
};

const upsertLink = (rel, href) => {
  if (!href) return;
  let element = document.head.querySelector(`link[rel="${rel}"]`);
  if (!element) {
    element = document.createElement("link");
    element.setAttribute("rel", rel);
    document.head.appendChild(element);
  }
  element.setAttribute("href", href);
};

export default function SEO({ title, description, canonicalPath, structuredData, image }) {
  useEffect(() => {
    const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL || window.location.origin || "http://localhost:3000").replace(/\/$/, "");
    const canonicalUrl = `${siteUrl}${canonicalPath || window.location.pathname}`;
    const imageUrl = image ? (image.startsWith("http") ? image : `${siteUrl}${image}`) : `${siteUrl}/og-default.svg`;

    document.title = title;
    upsertMeta("name", "description", description);
    upsertMeta("property", "og:title", title);
    upsertMeta("property", "og:description", description);
    upsertMeta("property", "og:type", structuredData?.["@type"] === "Product" ? "product" : "website");
    upsertMeta("property", "og:url", canonicalUrl);
    upsertMeta("property", "og:image", imageUrl);
    upsertMeta("name", "twitter:card", "summary_large_image");
    upsertMeta("name", "twitter:title", title);
    upsertMeta("name", "twitter:description", description);
    upsertMeta("name", "twitter:image", imageUrl);
    upsertLink("canonical", canonicalUrl);

    let script = document.head.querySelector("script[data-seo-structured-data]");
    if (structuredData) {
      if (!script) {
        script = document.createElement("script");
        script.type = "application/ld+json";
        script.dataset.seoStructuredData = "true";
        document.head.appendChild(script);
      }
      script.textContent = JSON.stringify(structuredData).replace(/</g, "\\u003c");
    } else if (script) {
      script.remove();
    }

    return () => {
      if (script?.isConnected) script.remove();
    };
  }, [title, description, canonicalPath, structuredData, image]);

  return null;
}
