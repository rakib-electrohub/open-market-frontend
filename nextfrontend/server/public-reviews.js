import { pool } from "./database-pool.js";

export async function getPublicReviewsPage({ limit = 10, offset = 0, rating = null } = {}) {
  const parsedLimit = Number(limit);
  const parsedOffset = Number(offset);
  const parsedRating = rating === null || rating === undefined || rating === "" ? null : Number(rating);

  if (!Number.isInteger(parsedLimit) || parsedLimit < 1 || parsedLimit > 50) {
    const error = new Error("Limit must be a whole number between 1 and 50");
    error.status = 400;
    throw error;
  }
  if (!Number.isInteger(parsedOffset) || parsedOffset < 0) {
    const error = new Error("Offset must be a non-negative whole number");
    error.status = 400;
    throw error;
  }
  if (parsedRating !== null && (!Number.isInteger(parsedRating) || parsedRating < 1 || parsedRating > 5)) {
    const error = new Error("Rating must be a whole number from 1 to 5");
    error.status = 400;
    throw error;
  }

  const [summaryResult, totalResult, reviewsResult] = await Promise.all([
    pool.query(`
      SELECT
        COUNT(*)::int AS total,
        COUNT(*) FILTER (WHERE data->>'rating' = '1')::int AS one_star,
        COUNT(*) FILTER (WHERE data->>'rating' = '2')::int AS two_star,
        COUNT(*) FILTER (WHERE data->>'rating' = '3')::int AS three_star,
        COUNT(*) FILTER (WHERE data->>'rating' = '4')::int AS four_star,
        COUNT(*) FILTER (WHERE data->>'rating' = '5')::int AS five_star,
        COALESCE(AVG((data->>'rating')::numeric), 0)::float AS average
      FROM entities
      WHERE entity = 'Review'
        AND data->>'is_approved' = 'true'
        AND data->>'rating' ~ '^[1-5]$'
    `),
    pool.query(`
      SELECT COUNT(*)::int AS total
      FROM entities
      WHERE entity = 'Review'
        AND data->>'is_approved' = 'true'
        AND data->>'rating' ~ '^[1-5]$'
        ${parsedRating === null ? "" : "AND data->>'rating' = $1"}
    `, parsedRating === null ? [] : [String(parsedRating)]),
    pool.query(`
      SELECT id, data, created_date
      FROM entities
      WHERE entity = 'Review'
        AND data->>'is_approved' = 'true'
        AND data->>'rating' ~ '^[1-5]$'
        ${parsedRating === null ? "" : "AND data->>'rating' = $3"}
      ORDER BY created_date DESC, id DESC
      LIMIT $1 OFFSET $2
    `, parsedRating === null
      ? [parsedLimit, parsedOffset]
      : [parsedLimit, parsedOffset, String(parsedRating)]),
  ]);

  const summary = summaryResult.rows[0];
  return {
    reviews: reviewsResult.rows.map((row) => ({
      id: row.id,
      rating: Number(row.data.rating),
      title: row.data.title || "",
      body: row.data.body || "",
      customer_name: row.data.customer_name || "Customer",
      product_name: row.data.product_name || "Product",
      created_date: row.created_date,
    })),
    total: totalResult.rows[0].total,
    limit: parsedLimit,
    offset: parsedOffset,
    summary: {
      total: summary.total,
      average: summary.average,
      ratingCounts: {
        1: summary.one_star,
        2: summary.two_star,
        3: summary.three_star,
        4: summary.four_star,
        5: summary.five_star,
      },
    },
  };
}
