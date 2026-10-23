export const persistCart = (cart) => {
  if (typeof window === "undefined") return;
  window.localStorage.setItem("cart", JSON.stringify(cart));
  window.dispatchEvent(new Event("open-market:cart-updated"));
};

export const getCartItemKey = (item) => {
  const selectedVariants = Object.entries(item.selected_variants || {}).sort(([a], [b]) => a.localeCompare(b));
  return `${item.product_id}:${JSON.stringify(selectedVariants)}`;
};