import { useEffect, useState } from "react";
import { useNavigate } from "@/lib/next-router";
import { apiClient } from "@/api/apiClient";
import SellerLayout from "@/components/seller/SellerLayout";
import { Button } from "@/components/ui/button";
import { Check, Loader2, Star } from "lucide-react";
import { usePersistentToast } from "@/components/ui/PersistentToast";
import { sellerHasDashboardPermission } from "@/utils/sellerPermissions";

export default function SellerReviews() {
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [savingReviewId, setSavingReviewId] = useState(null);
  const [canModerateReviews, setCanModerateReviews] = useState(false);
  const notify = usePersistentToast();
  const navigate = useNavigate();

  useEffect(() => {
    let active = true;
    apiClient.auth.me().then(async (user) => {
      const sellers = await apiClient.entities.Seller.filter({ user_id: user.id });
      const seller = sellers.find((entry) => entry.status === "approved");
      if (!seller) {
        navigate("/seller/dashboard");
        return;
      }
      const sellerReviews = await apiClient.entities.Review.list("-created_date", 200);
      if (active) {
        setReviews(sellerReviews);
        setCanModerateReviews(sellerHasDashboardPermission(seller, "reviews"));
        setLoading(false);
      }
    }).catch((error) => {
      console.error("Failed to load seller reviews:", error);
      if (active) {
        notify(error.message || "Could not load reviews", "error");
        setLoading(false);
      }
    });
    return () => { active = false; };
  }, [navigate, notify]);

  const setApproval = async (review, is_approved) => {
    setSavingReviewId(review.id);
    try {
      const updated = await apiClient.entities.Review.update(review.id, { is_approved });
      setReviews((current) => current.map((entry) => entry.id === review.id ? updated : entry));
      notify(is_approved ? "Review approved" : "Review hidden", "success");
    } catch (error) {
      notify(error.message || "Could not update review", "error");
    } finally {
      setSavingReviewId(null);
    }
  };

  const pendingCount = reviews.filter((review) => !review.is_approved).length;

  return (
    <SellerLayout>
      <div className="mx-auto max-w-5xl space-y-5">
        <div>
          <h2 className="flex items-center gap-2 font-poppins text-xl font-bold">
            <Star className="h-5 w-5 text-primary" /> Product Reviews
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            View feedback on your products. {pendingCount} pending.
            {!canModerateReviews && " Review approval and hiding are controlled by the admin."}
          </p>
        </div>
        {loading ? (
          <div className="flex justify-center py-16"><Loader2 className="h-7 w-7 animate-spin text-primary" /></div>
        ) : reviews.length === 0 ? (
          <div className="rounded-xl border border-border bg-white p-12 text-center text-sm text-muted-foreground">No reviews for your products yet.</div>
        ) : (
          <div className="space-y-3">
            {reviews.map((review) => (
              <article key={review.id} className="rounded-xl border border-border bg-white p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <div className="flex" aria-label={`${review.rating} out of 5 stars`}>
                        {[1, 2, 3, 4, 5].map((star) => (
                          <Star key={star} className={`h-3.5 w-3.5 ${star <= review.rating ? "fill-yellow-400 text-yellow-400" : "fill-gray-200 text-gray-200"}`} />
                        ))}
                      </div>
                      <span className="text-sm font-semibold">{review.customer_name || "Customer"}</span>
                      <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${review.is_approved ? "bg-green-100 text-green-700" : "bg-yellow-100 text-yellow-700"}`}>
                        {review.is_approved ? "Approved" : "Pending"}
                      </span>
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">Product: {review.product_name || "Your product"}</p>
                    {review.title && <p className="mt-2 text-sm font-medium">{review.title}</p>}
                    {review.body && <p className="mt-1 whitespace-pre-wrap text-sm text-muted-foreground">{review.body}</p>}
                    <p className="mt-2 text-xs text-muted-foreground">
                      {review.created_date ? new Date(review.created_date).toLocaleDateString() : ""}
                    </p>
                  </div>
                  {canModerateReviews && (
                    <Button
                      type="button"
                      size="sm"
                      variant={review.is_approved ? "outline" : "default"}
                      onClick={() => setApproval(review, !review.is_approved)}
                      disabled={savingReviewId === review.id}
                    >
                      {savingReviewId === review.id
                        ? <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" />
                        : review.is_approved ? null : <Check className="mr-1 h-3.5 w-3.5" />}
                      {review.is_approved ? "Hide review" : "Approve"}
                    </Button>
                  )}
                </div>
              </article>
            ))}
          </div>
        )}
      </div>
    </SellerLayout>
  );
}
