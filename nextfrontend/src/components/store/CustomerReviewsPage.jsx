"use client";

import { useState } from "react";
import { Loader2, Star } from "lucide-react";
import { apiClient } from "@/api/apiClient";

const PAGE_SIZE = 10;
const RATINGS = [5, 4, 3, 2, 1];

function RatingStars({ rating, size = "h-4 w-4" }) {
  return (
    <span className="inline-flex items-center gap-0.5" aria-label={`${rating} out of 5 stars`}>
      {[1, 2, 3, 4, 5].map((star) => (
        <Star
          key={star}
          aria-hidden="true"
          className={`${size} ${star <= rating ? "fill-amber-400 text-amber-400" : "fill-muted text-muted"}`}
        />
      ))}
    </span>
  );
}

export default function CustomerReviewsPage({ initialData }) {
  const [pageData, setPageData] = useState(initialData);
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedRating, setSelectedRating] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const totalPages = Math.max(1, Math.ceil(pageData.total / PAGE_SIZE));
  const ratingCount = Object.values(pageData.summary.ratingCounts).reduce((sum, count) => sum + count, 0);

  const loadPage = async (nextPage, nextRating = selectedRating) => {
    setLoading(true);
    setError("");
    try {
      const nextData = await apiClient.publicReviews.list({
        limit: PAGE_SIZE,
        offset: (nextPage - 1) * PAGE_SIZE,
        ...(nextRating ? { rating: nextRating } : {}),
      });
      setPageData(nextData);
      setCurrentPage(nextPage);
      setSelectedRating(nextRating);
    } catch (loadError) {
      setError(loadError.message || "Could not load customer reviews.");
    } finally {
      setLoading(false);
    }
  };

  const toggleRating = (rating) => {
    loadPage(1, selectedRating === rating ? null : rating);
  };

  return (
    <main className="mx-auto min-h-[60vh] max-w-5xl px-4 py-8 md:py-12">
      <header className="mb-8 text-center">
        <p className="text-sm font-semibold uppercase tracking-wider text-primary">Customer feedback</p>
        <h1 className="mt-2 font-poppins text-3xl font-bold text-foreground">Customer Reviews</h1>
        <p className="mx-auto mt-3 max-w-2xl text-sm text-muted-foreground">
          Read feedback from customers about their shopping experience.
        </p>
      </header>

      <section aria-label="Review ratings" className="mb-8 grid gap-6 rounded-2xl border border-border bg-white p-5 sm:grid-cols-[minmax(180px,0.7fr)_1fr] sm:p-7">
        <div className="flex flex-col items-center justify-center border-b border-border pb-5 text-center sm:border-b-0 sm:border-r sm:pb-0 sm:pr-6">
          <p className="text-5xl font-bold text-foreground">{pageData.summary.total ? pageData.summary.average.toFixed(1) : "—"}</p>
          <RatingStars rating={Math.round(pageData.summary.average)} size="h-5 w-5" />
          <p className="mt-2 text-sm text-muted-foreground">
            {pageData.summary.total.toLocaleString()} approved {pageData.summary.total === 1 ? "review" : "reviews"}
          </p>
        </div>

        <div className="space-y-2">
          {RATINGS.map((rating) => {
            const count = pageData.summary.ratingCounts[rating] || 0;
            const share = ratingCount ? (count / ratingCount) * 100 : 0;
            const isSelected = selectedRating === rating;
            return (
              <button
                key={rating}
                type="button"
                aria-pressed={isSelected}
                onClick={() => toggleRating(rating)}
                disabled={loading}
                className={`flex w-full items-center gap-3 rounded-md px-2 py-1 text-left text-sm transition-colors disabled:cursor-wait ${isSelected ? "bg-primary/10 text-primary" : "text-foreground hover:bg-muted/60"}`}
              >
                <span className="w-12 shrink-0">{rating} star</span>
                <div className="h-2 flex-1 overflow-hidden rounded-full bg-muted">
                  <div className="h-full rounded-full bg-amber-400" style={{ width: `${share}%` }} />
                </div>
                <span className="w-12 shrink-0 text-right text-muted-foreground">{count.toLocaleString()}</span>
              </button>
            );
          })}
          <p className="pt-1 text-xs text-muted-foreground">Select a star rating to filter reviews.</p>
        </div>
      </section>

      <section aria-label="Customer review list">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
          <h2 className="font-poppins text-lg font-semibold text-foreground">
            {selectedRating ? `${selectedRating}-star reviews` : "Recent reviews"}
          </h2>
          {selectedRating && (
            <button type="button" onClick={() => loadPage(1, null)} disabled={loading} className="text-sm font-medium text-primary hover:underline disabled:opacity-60">
              Clear rating filter
            </button>
          )}
        </div>

        {error && (
          <div role="alert" className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            <span>Unable to load reviews: {error}</span>
            <button type="button" onClick={() => loadPage(currentPage)} className="font-semibold underline">Try again</button>
          </div>
        )}

        {loading ? (
          <div className="flex items-center justify-center gap-2 py-12 text-sm text-muted-foreground" role="status">
            <Loader2 className="h-5 w-5 animate-spin" />
            Loading reviews…
          </div>
        ) : pageData.reviews.length ? (
          <div className="space-y-4">
            {pageData.reviews.map((review) => (
              <article key={review.id} className="rounded-xl border border-border bg-white p-5 sm:p-6">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold text-foreground">{review.customer_name}</p>
                    <p className="mt-1 text-xs text-muted-foreground">Purchased: {review.product_name}</p>
                  </div>
                  <time dateTime={review.created_date} className="text-xs text-muted-foreground">
                    {new Intl.DateTimeFormat("en", { dateStyle: "medium", timeZone: "UTC" }).format(new Date(review.created_date))}
                  </time>
                </div>
                <div className="mt-3">
                  <RatingStars rating={review.rating} />
                </div>
                {review.title && <h3 className="mt-3 font-semibold text-foreground">{review.title}</h3>}
                {review.body && <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-muted-foreground">{review.body}</p>}
              </article>
            ))}
          </div>
        ) : (
          <p className="rounded-xl border border-border bg-white px-4 py-10 text-center text-sm text-muted-foreground">
            {selectedRating ? `No ${selectedRating}-star reviews yet.` : "No approved customer reviews yet."}
          </p>
        )}

        {pageData.total > 0 && (
          <nav aria-label="Review pages" className="mt-7 flex items-center justify-center gap-4">
            <button
              type="button"
              onClick={() => loadPage(currentPage - 1)}
              disabled={loading || currentPage <= 1}
              className="rounded-lg border border-border bg-white px-4 py-2 text-sm font-medium text-foreground hover:border-primary disabled:cursor-not-allowed disabled:opacity-50"
            >
              Previous
            </button>
            <span className="text-sm text-muted-foreground">Page {currentPage} of {totalPages}</span>
            <button
              type="button"
              onClick={() => loadPage(currentPage + 1)}
              disabled={loading || currentPage >= totalPages}
              className="rounded-lg border border-border bg-white px-4 py-2 text-sm font-medium text-foreground hover:border-primary disabled:cursor-not-allowed disabled:opacity-50"
            >
              Next
            </button>
          </nav>
        )}
      </section>
    </main>
  );
}
