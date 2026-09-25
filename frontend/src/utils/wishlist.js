import { getProductImageUrls } from "@/utils/imageUrls";

export const buildWishlistItem = (product, userEmail) => {
  const images = getProductImageUrls(product);
  return {
    product_id: product.id,
    product_name: product.name,
    product_image: images[0] || "",
    product_price: product.flash_sale_price && product.flash_sale_end && new Date(product.flash_sale_end) > new Date()
      ? product.flash_sale_price
      : product.price,
    created_by: userEmail,
  };
};
