import { initializeDatabase } from "../../../../../server/database-pool.js";
import { getPublicReviewsPage } from "../../../../../server/public-reviews.js";

export const dynamic = "force-dynamic";

export async function GET(request) {
  try {
    await initializeDatabase();
    const params = new URL(request.url).searchParams;
    const page = await getPublicReviewsPage({
      limit: params.has("limit") ? params.get("limit") : 10,
      offset: params.has("offset") ? params.get("offset") : 0,
      rating: params.has("rating") ? params.get("rating") : null,
    });
    return Response.json(page);
  } catch (error) {
    return Response.json(
      { message: error.message || "Could not load customer reviews" },
      { status: error.status || 500 }
    );
  }
}
