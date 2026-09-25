export const parseOrder = (order) => {
  if (!order) return 'created_date DESC';
  const direction = String(order).startsWith('-') ? 'DESC' : 'ASC';
  const field = String(order).replace(/^[-+]/, '');
  if (!/^[A-Za-z0-9_]+$/.test(field)) {
    return 'created_date DESC';
  }
  if (field === 'created_date' || field === 'updated_date' || field === 'id') {
    return `${field} ${direction}`;
  }
  const numericFields = ['sold_count', 'price', 'stock', 'average_rating', 'review_count'];
  if (numericFields.includes(field)) {
    return `NULLIF(data->>'${field}','')::numeric ${direction}`;
  }
  const allowedTextFields = ['name', 'status', 'approval_status', 'category', 'seller_name', 'customer_email'];
  if (allowedTextFields.includes(field)) {
    return `data->>'${field}' ${direction}`;
  }
  return 'created_date DESC';
};
