import { useEffect } from "react";

const upsertMeta = (attribute, key, content) => {
  let element = document.head.querySelector(`meta[${attribute}="${key}"]`);
  if (!element) {
    element = document.createElement("meta");
    element.setAttribute(attribute, key);
    document.head.appendChild(element);
  }
  element.setAttribute("content", content);
};

const upsertLink = (rel, href) => {
  let element = document.head.querySelector(`link[rel="${rel}"]`);
  if (!element) {
    element = document.createElement("link");
    element.setAttribute("rel", rel);
    document.head.appendChild(element);
  }
  element.setAttribute("href", href);
};

export default function SEO({ title, description, canonicalPath, structuredData }) {
  useEffect(() => {
    const siteUrl = (import.meta.env.VITE_SITE_URL || window.location.origin).replace(/\/$/, "");
    const canonicalUrl = `${siteUrl}${canonicalPath || window.location.pathname}`;

    document.title = title;
    upsertMeta("name", "description", description);
    upsertMeta("property", "og:title", title);
    upsertMeta("property", "og:description", description);
    upsertMeta("property", "og:type", structuredData?.["@type"] === "Product" ? "product" : "website");
    upsertMeta("property", "og:url", canonicalUrl);
    upsertMeta("name", "twitter:card", "summary_large_image");
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
  }, [title, description, canonicalPath, structuredData]);

  return null;
}
