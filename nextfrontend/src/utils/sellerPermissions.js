export const SELLER_DASHBOARD_SECTIONS = [
  { id: "products", label: "Products" },
  { id: "inventory", label: "Inventory" },
  { id: "chats", label: "Chats" },
  { id: "orders", label: "Order management (own products)" },
  { id: "reviews", label: "Approve / hide product reviews" },
  { id: "store_settings", label: "Store pickup settings" },
];

export function getSellerDashboardPermissions(seller) {
  if (!Array.isArray(seller?.dashboard_permissions)) {
    return ["products", "inventory", "chats", "store_settings"];
  }
  return seller.dashboard_permissions;
}

export function sellerHasDashboardPermission(seller, permission) {
  return getSellerDashboardPermissions(seller).includes(permission);
}
