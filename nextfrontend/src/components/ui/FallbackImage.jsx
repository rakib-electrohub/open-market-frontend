import { useEffect, useMemo, useState } from "react";
import { uniqueImageUrls } from "@/utils/imageUrls";

export default function FallbackImage({ src, sources, alt = "", className = "", fallback = null, ...props }) {
  const urls = useMemo(
    () => uniqueImageUrls([...(Array.isArray(sources) ? sources : []), src]),
    [src, sources]
  );
  const [index, setIndex] = useState(0);

  useEffect(() => {
    setIndex(0);
  }, [urls.join("|")]);

  if (!urls.length || index >= urls.length) return fallback;

  return (
    <img
      {...props}
      src={urls[index]}
      alt={alt}
      className={className}
      onError={(event) => {
        props.onError?.(event);
        setIndex((current) => current + 1);
      }}
    />
  );
}
