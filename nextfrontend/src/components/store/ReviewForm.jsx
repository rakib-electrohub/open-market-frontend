import { useState } from "react";
import { apiClient } from "@/api/apiClient";
import { uploadImageWithSizeCheck } from "@/utils/imageUpload";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Star, Loader2, Camera, X } from "lucide-react";

export default function ReviewForm({ productId, productName, onReviewSubmitted }) {
  const [rating, setRating] = useState(0);
  const [hovered, setHovered] = useState(0);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [photo, setPhoto] = useState(null);
  const [photoPreview, setPhotoPreview] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const handlePhotoChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setPhoto(file);
    setPhotoPreview(URL.createObjectURL(file));
  };

  const removePhoto = () => {
    setPhoto(null);
    if (photoPreview) URL.revokeObjectURL(photoPreview);
    setPhotoPreview(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!rating) { alert("Please select a rating"); return; }
    setSubmitting(true);

    let photo_url = null;
    if (photo) {
      setUploading(true);
      try {
        const result = await uploadImageWithSizeCheck(photo, (message) => alert(message));
        photo_url = result.file_url;
      } catch (error) {
        alert(error.message || 'Photo upload failed');
        setUploading(false);
        setSubmitting(false);
        return;
      }
      setUploading(false);
    }

    const user = await apiClient.auth.me().catch(() => null);
    await apiClient.entities.Review.create({
      product_id: productId,
      product_name: productName,
      customer_name: user?.name || "Customer",
      customer_email: user?.email || "",
      rating,
      title,
      body,
      photo_url,
      is_approved: false,
    });

    setRating(0); setTitle(""); setBody(""); removePhoto();
    setSubmitting(false);
    onReviewSubmitted?.();
    alert("Review submitted! It will appear after admin approval.");
  };

  return (
    <form onSubmit={handleSubmit} className="bg-muted/30 rounded-xl p-5 mt-5">
      <h3 className="font-semibold mb-4">Write a Review</h3>

      {/* Star rating */}
      <div className="flex items-center gap-1 mb-4">
        {[1, 2, 3, 4, 5].map(s => (
          <button key={s} type="button"
            onMouseEnter={() => setHovered(s)}
            onMouseLeave={() => setHovered(0)}
            onClick={() => setRating(s)}>
            <Star className={`w-7 h-7 transition-colors ${s <= (hovered || rating) ? "text-yellow-400 fill-yellow-400" : "text-gray-300 fill-gray-200"}`} />
          </button>
        ))}
        {rating > 0 && <span className="text-sm text-muted-foreground ml-2">{["", "Poor", "Fair", "Good", "Very Good", "Excellent"][rating]}</span>}
      </div>

      <div className="space-y-3">
        <Input value={title} onChange={e => setTitle(e.target.value)} placeholder="Review title (optional)" />
        <textarea value={body} onChange={e => setBody(e.target.value)} placeholder="Share your experience with this product..."
          rows={3} className="w-full border border-input rounded-md px-3 py-2 text-sm bg-transparent resize-none focus:outline-none focus:ring-1 focus:ring-ring" />

        {/* Photo upload */}
        <div>
          <p className="text-xs text-muted-foreground mb-2">Add a photo (optional)</p>
          {photoPreview ? (
            <div className="relative inline-block">
              <img src={photoPreview} alt="Preview" className="w-24 h-24 object-cover rounded-lg border border-border" />
              <button type="button" onClick={removePhoto}
                className="absolute -top-1.5 -right-1.5 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center shadow">
                <X className="w-3 h-3" />
              </button>
            </div>
          ) : (
            <label className="inline-flex items-center gap-2 cursor-pointer border border-dashed border-border rounded-lg px-4 py-2.5 hover:border-primary hover:bg-primary/5 transition-all text-sm text-muted-foreground">
              <Camera className="w-4 h-4" />
              <span>Choose from device</span>
              <input type="file" accept="image/*" className="hidden" onChange={handlePhotoChange} />
            </label>
          )}
        </div>
      </div>

      <Button type="submit" disabled={submitting} className="mt-3 bg-primary hover:bg-primary/90">
        {submitting ? (
          <><Loader2 className="w-4 h-4 mr-2 animate-spin" />{uploading ? "Uploading photo..." : "Submitting..."}</>
        ) : "Submit Review"}
      </Button>
    </form>
  );
}

