import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { apiClient } from "@/api/apiClient";
import AdminLayout from "@/components/admin/AdminLayout";
import ProductDetailsModal from "@/components/ProductDetailsModal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Star, Check, X, Search, Loader2, MessageSquare } from "lucide-react";
import { usePersistentToast } from "@/components/ui/PersistentToast";

export default function AdminReviews() {
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("pending");
  const [search, setSearch] = useState("");
  const [showProductModal, setShowProductModal] = useState(false);
  const [selectedProductId, setSelectedProductId] = useState(null);
  const notify = usePersistentToast();

  useEffect(() => {
    apiClient.entities.Review.list("-created_date", 200).then(r => {
      setReviews(r);
      setLoading(false);
    });
  }, []);

  const approve = async (review) => {
    const updated = await apiClient.entities.Review.update(review.id, { is_approved: true });
    setReviews(reviews.map(r => r.id === review.id ? updated : r));
    notify("Review approved", "success");
  };

  const reject = async (review) => {
    await apiClient.entities.Review.delete(review.id);
    setReviews(reviews.filter(r => r.id !== review.id));
    notify("Review deleted", "delete");
  };

  const filtered = reviews.filter(r => {
    const matchFilter = filter === "all" || (filter === "pending" ? !r.is_approved : r.is_approved);
    const matchSearch = !search ||
      r.product_name?.toLowerCase().includes(search.toLowerCase()) ||
      r.customer_name?.toLowerCase().includes(search.toLowerCase()) ||
      r.customer_email?.toLowerCase().includes(search.toLowerCase()) ||
      (r.customer_id && r.customer_id.toString().includes(search));
    return matchFilter && matchSearch;
  });

  const pendingCount = reviews.filter(r => !r.is_approved).length;

  return (
    <AdminLayout>
      <div className="space-y-5">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-white font-poppins font-bold text-xl flex items-center gap-2">
              <MessageSquare className="w-5 h-5 text-primary" /> Reviews
            </h2>
            <p className="text-gray-400 text-sm">{pendingCount} pending approval</p>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-500" />
            <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by product or customer..."
              className="pl-9 bg-gray-800 border-gray-700 text-white placeholder:text-gray-500" />
          </div>
          <div className="flex gap-2">
            {[["pending", "Pending"], ["approved", "Approved"], ["all", "All"]].map(([val, label]) => (
              <button key={val} onClick={() => setFilter(val)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${filter === val ? "bg-primary text-white" : "bg-gray-800 text-gray-400 hover:text-white"}`}>
                {label}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-3">
          {loading ? (
            <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-12 text-gray-500">No reviews found</div>
          ) : filtered.map(review => (
            <div key={review.id} className="bg-gray-900 border border-gray-800 rounded-xl p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <div className="flex">
                      {[1,2,3,4,5].map(s => (
                        <Star key={s} className={`w-3.5 h-3.5 ${s <= review.rating ? "text-yellow-400 fill-yellow-400" : "text-gray-600 fill-gray-600"}`} />
                      ))}
                    </div>
                    <span className="text-white text-sm font-semibold">{review.customer_name || "Customer"}</span>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${review.is_approved ? "bg-green-900/50 text-green-400" : "bg-yellow-900/50 text-yellow-400"}`}>
                      {review.is_approved ? "Approved" : "Pending"}
                    </span>
                  </div>
                  <p className="text-gray-400 text-xs mb-1">
                    Product: 
                    <button
                      onClick={() => {
                        setSelectedProductId(review.product_id);
                        setShowProductModal(true);
                      }}
                      className="text-primary hover:underline ml-1"
                    >
                      {review.product_name}
                    </button>
                  </p>
                  {review.title && <p className="text-white text-sm font-medium mb-0.5">{review.title}</p>}
                  {review.body && <p className="text-gray-400 text-sm">{review.body}</p>}
                  {(review.customer_email || review.customer_id) && (
                    <p className="text-gray-400 text-xs mt-2">
                      Customer:
                      {review.customer_email ? (
                        <a href={`mailto:${review.customer_email}`} className="text-primary hover:underline ml-1">{review.customer_email}</a>
                      ) : null}
                      {review.customer_id ? <span className="ml-2">ID: {review.customer_id}</span> : null}
                    </p>
                  )}
                  {((review.images && review.images.length > 0) || review.photo_url) && (
                    <div className="mt-2 flex gap-2">
                      {(review.images?.length ? review.images : [review.photo_url]).slice(0, 3).map((img, idx) => (
                        <img key={idx} src={img} alt={`Review ${idx}`} className="w-12 h-12 rounded object-cover" />
                      ))}
                      {((review.images?.length || 0) - 3) > 0 && (
                        <div className="w-12 h-12 rounded bg-gray-800 flex items-center justify-center text-xs text-gray-400">
                          +{review.images.length - 3}
                        </div>
                      )}
                    </div>
                  )}
                  <p className="text-gray-600 text-xs mt-1">{new Date(review.created_date).toLocaleDateString()}</p>
                  {review.customer_email && (
                    <Link to={`/admin/users?query=${encodeURIComponent(review.customer_email)}`} className="text-primary text-xs hover:underline mt-2 inline-block">
                      View customer record
                    </Link>
                  )}
                </div>
                {!review.is_approved && (
                  <div className="flex gap-2 flex-shrink-0">
                    <Button size="sm" onClick={() => approve(review)} className="h-7 px-3 bg-green-600 hover:bg-green-700 text-white text-xs">
                      <Check className="w-3.5 h-3.5 mr-1" /> Approve
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => reject(review)} className="h-7 px-3 border-red-800 text-red-400 hover:bg-red-900/30 text-xs">
                      <X className="w-3.5 h-3.5 mr-1" /> Delete
                    </Button>
                  </div>
                )}
                {review.is_approved && (
                  <Button size="sm" variant="outline" onClick={() => reject(review)} className="h-7 px-3 border-red-800 text-red-400 hover:bg-red-900/30 text-xs flex-shrink-0">
                    <X className="w-3.5 h-3.5 mr-1" /> Delete
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>

        <ProductDetailsModal
          isOpen={showProductModal}
          onClose={() => setShowProductModal(false)}
          productId={selectedProductId}
        />
      </div>
    </AdminLayout>
  );
}

