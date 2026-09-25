const LOCAL_HOSTS = new Set(["localhost", "127.0.0.1", "::1"]);

export const normalizeImageUrl = (url) => {
  if (!url || typeof url !== "string") return "";
  const trimmed = url.trim();
  if (!trimmed) return "";

  if (/^https?:\/\//i.test(trimmed)) {
    try {
      const parsed = new URL(trimmed);
      const isLocalUpload = LOCAL_HOSTS.has(parsed.hostname) && (
        parsed.pathname.startsWith("/api/uploads/") ||
        parsed.pathname.startsWith("/uploads/")
      );
      const isSameOriginUpload = typeof window !== "undefined" &&
        parsed.origin === window.location.origin &&
        (parsed.pathname.startsWith("/api/uploads/") || parsed.pathname.startsWith("/uploads/"));

      if (isLocalUpload || isSameOriginUpload) {
        return `${parsed.pathname}${parsed.search}${parsed.hash}`;
      }
    } catch {
      return trimmed;
    }
  }

  if (trimmed.startsWith("api/uploads/") || trimmed.startsWith("uploads/")) {
    return `/${trimmed}`;
  }

  return trimmed;
};

export const parseImageList = (value) => {
  if (!value) return [];
  if (Array.isArray(value)) return value.map(normalizeImageUrl).filter(Boolean);

  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed) return [];

    try {
      const parsed = JSON.parse(trimmed);
      if (Array.isArray(parsed)) return parsed.map(normalizeImageUrl).filter(Boolean);
    } catch {
      return [normalizeImageUrl(trimmed)].filter(Boolean);
    }

    return [normalizeImageUrl(trimmed)].filter(Boolean);
  }

  return [];
};

export const uniqueImageUrls = (urls) => {
  const seen = new Set();
  return urls
    .map(normalizeImageUrl)
    .filter((url) => {
      if (!url || seen.has(url)) return false;
      seen.add(url);
      return true;
    });
};

export const getProductImageUrls = (product = {}) => uniqueImageUrls([
  ...parseImageList(product.images),
  product.product_image,
  product.image_url,
  product.thumbnail_url,
]);
