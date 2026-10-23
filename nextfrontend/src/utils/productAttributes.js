const toText = (value) => (value == null ? "" : String(value).trim());

export function normalizeProductVariants(variants) {
  if (!Array.isArray(variants)) return [];

  return variants
    .map((variant) => ({
      name: toText(variant?.name),
      options: Array.isArray(variant?.options)
        ? variant.options
          .map((option) => {
            const value = toText(typeof option === "string" ? option : option?.value ?? option?.name);
            if (!value) return null;
            const adjustment = Number(option?.price_adjustment);
            return {
              value,
              price_adjustment: Number.isFinite(adjustment) ? adjustment : 0,
            };
          })
          .filter(Boolean)
          .filter((option, index, options) => options.findIndex((entry) => entry.value.toLowerCase() === option.value.toLowerCase()) === index)
        : [],
    }))
    .filter((variant) => variant.name && variant.options.length);
}

export function getVariantPrice(variants, selectedVariants, basePrice) {
  const adjustment = normalizeProductVariants(variants).reduce((total, variant) => {
    const selectedValue = selectedVariants?.[variant.name];
    const option = variant.options.find((entry) => entry.value === selectedValue);
    return total + (option?.price_adjustment || 0);
  }, 0);

  return Math.max(0, (Number(basePrice) || 0) + adjustment);
}

export function normalizeProductSpecifications(specifications) {
  const entries = Array.isArray(specifications)
    ? specifications
    : specifications && typeof specifications === "object"
      ? Object.entries(specifications).map(([name, value]) => ({ name, value }))
      : [];

  return entries
    .map((specification) => ({
      name: toText(specification?.name),
      value: toText(specification?.value),
    }))
    .filter((specification) => specification.name && specification.value);
}
