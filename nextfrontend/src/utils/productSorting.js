export const PRODUCT_SORT_OPTIONS = [
  { value: "relevance", label: "Relevance" },
  { value: "popularity", label: "Popularity" },
  { value: "newest", label: "Newest First" },
  { value: "price_asc", label: "Price: Low to High" },
  { value: "price_desc", label: "Price: High to Low" },
  { value: "rating", label: "Top Rated" },
];

const PRODUCT_SORT_ORDERS = {
  relevance: "relevance",
  popularity: "-sold_count",
  newest: "-created_date",
  price_asc: "price",
  price_desc: "-price",
  rating: "-average_rating",
};

export const getProductSortOrder = (sort) => PRODUCT_SORT_ORDERS[sort] || PRODUCT_SORT_ORDERS.popularity;

export const isProductSort = (sort) => Object.hasOwn(PRODUCT_SORT_ORDERS, sort);
