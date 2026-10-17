export const persistCart = (cart) => {
  if (typeof window === "undefined") return;
  window.localStorage.setItem("cart", JSON.stringify(cart));
  window.dispatchEvent(new Event("open-market:cart-updated"));
};