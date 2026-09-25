import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { apiClient } from "@/api/apiClient";
import { useAppSettings } from "@/hooks/useAppSettings";
import { usePersistentToast } from "@/components/ui/PersistentToast";
import RichTextEditor from "@/components/RichTextEditor";
import { uploadImageWithSizeCheck } from "@/utils/imageUpload";
import SellerLayout from "@/components/seller/SellerLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Plus, Package, Edit2, Trash2, Loader2, X, Save,
  ImagePlus, Link2, Upload, Zap, GripVertical
} from "lucide-react";
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import FallbackImage from "@/components/ui/FallbackImage";
import { getProductImageUrls } from "@/utils/imageUrls";
import { getCategoriesFromSettings, getMainCategories, getSubCategories, getCategoryDisplayLabel } from "@/utils/categories";

const STATUS_COLORS = {
  pending: "bg-yellow-100 text-yellow-700",
  approved: "bg-green-100 text-green-700",
  rejected: "bg-red-100 text-red-700",
};

const EMPTY_FORM = { name: "", description: "", short_description: "", price: "", compare_price: "", category: "", main_category: "", subcategory: "", stock: "", sku: "", brand: "", images: [], video_url: "", is_active: true };

export default function SellerProducts() {
  const settings = useAppSettings();
  const [seller, setSeller] = useState(null);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [imageUrl, setImageUrl] = useState("");
  const [imageMode, setImageMode] = useState("url"); // "url" | "upload"
  const [flashDialog, setFlashDialog] = useState(false);
  const [categoryOptions, setCategoryOptions] = useState([]);
  const [flashProduct, setFlashProduct] = useState(null);
  const [flashForm, setFlashForm] = useState({ requested_price: "", start_date: "", end_date: "" });
  const [flashSaving, setFlashSaving] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const notify = usePersistentToast();
  const navigate = useNavigate();

  useEffect(() => {
    apiClient.auth.me()
      .then(async (user) => {
        const sellers = await apiClient.entities.Seller.filter({ user_id: user.id });
        if (!sellers.length || sellers[0].status !== "approved") { navigate("/seller/dashboard"); return; }
        setSeller(sellers[0]);
        const [prods, categories] = await Promise.all([
          apiClient.entities.Product.filter({ seller_id: sellers[0].id }, "-created_date", 100),
          apiClient.entities.Category.list("-created_date", 200),
        ]);
        setProducts(prods);
        setCategoryOptions(categories || []);
        setLoading(false);
      })
      .catch(() => apiClient.auth.redirectToLogin("/seller/products"));
  }, []);

  const openCreate = () => { setEditing(null); setForm({ ...EMPTY_FORM }); setImageUrl(""); setImageMode("url"); setShowForm(true); };
  const openEdit = (p) => {
    setEditing(p);
    setForm({ ...EMPTY_FORM, name: p.name || "", description: p.description || "", short_description: p.short_description || "", price: p.price || "", compare_price: p.compare_price || "", category: p.category || "", main_category: p.main_category || (p.category && !p.subcategory ? p.category : ""), subcategory: p.subcategory || "", stock: p.stock || "", sku: p.sku || "", brand: p.brand || "", images: p.images || [], is_active: p.is_active ?? true });
    setImageUrl("");
    setImageMode("url");
    setShowForm(true);
  };

  const addImage = () => {
    if (imageUrl.trim()) { setForm(f => ({ ...f, images: [...f.images, imageUrl.trim()] })); setImageUrl(""); }
  };
  const removeImage = async (img) => {
    const wasAlreadySaved = editing?.images?.includes(img);
    setForm(f => ({ ...f, images: f.images.filter(url => url !== img) }));
    if (!wasAlreadySaved) {
      await apiClient.integrations.Core.DeleteFile({ file_url: img }).catch(() => {});
    }
  };
  const onDragEnd = (result) => {
    if (!result.destination) return;
    const imgs = Array.from(form.images);
    const [moved] = imgs.splice(result.source.index, 1);
    imgs.splice(result.destination.index, 0, moved);
    setForm(f => ({ ...f, images: imgs }));
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) { notify("Please select an image file", "error"); return; }
    setUploadingImage(true);
    try {
      const { file_url } = await uploadImageWithSizeCheck(file, notify);
      setForm(f => ({ ...f, images: [...f.images, file_url] }));
    } catch (error) {
      notify(error.message || 'File upload failed', 'error');
    }
    setUploadingImage(false);
    e.target.value = "";
  };

  const categories = getCategoriesFromSettings(settings);
  const mainCategories = getMainCategories(categoryOptions.length ? categoryOptions : categories.map((name) => ({ id: name, name, parent_id: null })));
  const subCategories = form.main_category ? getSubCategories(categoryOptions.length ? categoryOptions : [], mainCategories.find((cat) => cat.name === form.main_category)?.id) : [];

  const handleSave = async (e) => {
    e.preventDefault();
    if (!form.name || !form.price || !form.main_category) { notify("Name, price and main category are required", "error"); return; }
    setSaving(true);
    const categoryValue = getCategoryDisplayLabel(form.main_category, form.subcategory) || form.category;
    const data = { ...form, category: categoryValue, main_category: form.main_category || "", subcategory: form.subcategory || "", price: parseFloat(form.price), compare_price: form.compare_price ? parseFloat(form.compare_price) : undefined, stock: parseInt(form.stock) || 0, seller_id: seller.id, seller_name: seller.store_name, approval_status: editing ? editing.approval_status : "pending" };
    if (editing) {
      const updated = await apiClient.entities.Product.update(editing.id, data);
      setProducts(products.map(p => p.id === editing.id ? updated : p));
      notify("Product updated!", "success");
    } else {
      const created = await apiClient.entities.Product.create(data);
      setProducts([created, ...products]);
      notify("Product submitted for approval!", "success");
    }
    setSaving(false);
    setShowForm(false);
  };

  const openFlashRequest = (p) => {
    setFlashProduct(p);
    const now = new Date();
    const end = new Date(now.getTime() + 24 * 60 * 60 * 1000);
    setFlashForm({
      requested_price: Math.round(p.price * 0.8),
      start_date: now.toISOString().slice(0, 16),
      end_date: end.toISOString().slice(0, 16),
    });
    setFlashDialog(true);
  };

  const submitFlashRequest = async () => {
    if (!flashForm.requested_price || !flashForm.end_date) { alert("Fill all required fields"); return; }
    if (parseFloat(flashForm.requested_price) >= flashProduct.price) { alert("Flash price must be less than original price"); return; }
    setFlashSaving(true);
    await apiClient.entities.FlashSaleRequest.create({
      product_id: flashProduct.id,
      product_name: flashProduct.name,
      product_image: flashProduct.images?.[0],
      seller_id: seller.id,
      seller_name: seller.store_name,
      original_price: flashProduct.price,
      requested_price: parseFloat(flashForm.requested_price),
      start_date: flashForm.start_date,
      end_date: flashForm.end_date,
      status: "pending",
    });
    setFlashSaving(false);
    setFlashDialog(false);
    alert("Flash sale request submitted! Waiting for admin approval.");
  };

  const handleDelete = async (id) => {
    if (!confirm("Delete this product?")) return;
    await apiClient.entities.Product.delete(id);
    setProducts(products.filter(p => p.id !== id));
    notify("Product deleted", "delete");
  };

  if (loading) return (
    <SellerLayout>
      <div className="flex items-center justify-center h-64"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>
    </SellerLayout>
  );

  return (
    <SellerLayout>
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-4 mb-6">
          <div className="flex-1">
            <h1 className="font-poppins font-bold text-xl">My Products</h1>
            <p className="text-muted-foreground text-sm">{products.length} products • {seller?.store_name}</p>
          </div>
          <Button onClick={openCreate} className="bg-primary hover:bg-primary/90 gap-2">
            <Plus className="w-4 h-4" /> Add Product
          </Button>
        </div>

        {/* Product Form Modal */}
        {showForm && (
          <div className="fixed inset-0 z-50 bg-black/50 flex items-start justify-center overflow-y-auto py-8 px-4">
            <div className="bg-white rounded-2xl w-full max-w-2xl p-6 my-auto shadow-2xl">
              <div className="flex justify-between items-center mb-5">
                <h2 className="font-poppins font-bold text-lg">{editing ? "Edit Product" : "Add New Product"}</h2>
                <button onClick={() => setShowForm(false)} className="p-1.5 hover:bg-muted rounded-lg"><X className="w-4 h-4" /></button>
              </div>
              <form onSubmit={handleSave} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="sm:col-span-2">
                    <Label className="text-xs font-medium">Product Name *</Label>
                    <Input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="Product name" className="mt-1" required />
                  </div>
                  <div>
                    <Label className="text-xs font-medium">Sale Price (৳) *</Label>
                    <Input type="number" value={form.price} onChange={e => setForm({ ...form, price: e.target.value })} placeholder="0.00" className="mt-1" required />
                  </div>
                  <div>
                    <Label className="text-xs font-medium">Compare Price (৳)</Label>
                    <Input type="number" value={form.compare_price} onChange={e => setForm({ ...form, compare_price: e.target.value })} placeholder="Original price" className="mt-1" />
                  </div>
                  <div>
                    <Label className="text-xs font-medium">Main Category *</Label>
                    <select value={form.main_category} onChange={e => setForm({ ...form, main_category: e.target.value, subcategory: "" })} className="mt-1 w-full border border-input rounded-md px-3 py-2 text-sm bg-transparent focus:outline-none focus:ring-1 focus:ring-ring" required>
                      <option value="">Select main category</option>
                      {mainCategories.map(c => <option key={c.id || c.name} value={c.name}>{c.name}</option>)}
                    </select>
                  </div>
                  <div>
                    <Label className="text-xs font-medium">Sub Category</Label>
                    <select value={form.subcategory} onChange={e => setForm({ ...form, subcategory: e.target.value })} disabled={!form.main_category} className="mt-1 w-full border border-input rounded-md px-3 py-2 text-sm bg-transparent focus:outline-none focus:ring-1 focus:ring-ring disabled:opacity-60">
                      <option value="">None</option>
                      {subCategories.map(c => <option key={c.id || c.name} value={c.name}>{c.name}</option>)}
                    </select>
                  </div>
                  <div>
                    <Label className="text-xs font-medium">Stock Quantity</Label>
                    <Input type="number" value={form.stock} onChange={e => setForm({ ...form, stock: e.target.value })} placeholder="0" className="mt-1" />
                  </div>
                  <div>
                    <Label className="text-xs font-medium">Brand</Label>
                    <Input value={form.brand} onChange={e => setForm({ ...form, brand: e.target.value })} placeholder="Brand name" className="mt-1" />
                  </div>
                  <div>
                    <Label className="text-xs font-medium">SKU</Label>
                    <Input value={form.sku} onChange={e => setForm({ ...form, sku: e.target.value })} placeholder="SKU-001" className="mt-1" />
                  </div>
                  <div className="sm:col-span-2">
                    <Label className="text-xs font-medium">Short Description</Label>
                    <Input value={form.short_description} onChange={e => setForm({ ...form, short_description: e.target.value })} placeholder="Brief product summary" className="mt-1" />
                  </div>
                  <div className="sm:col-span-2">
                    <Label className="text-xs font-medium">Full Description</Label>
                    <RichTextEditor value={form.description} onChange={value => setForm({ ...form, description: value })} minHeight={260} />
                  </div>
                  {/* Images */}
                  <div className="sm:col-span-2">
                    <Label className="text-xs font-medium mb-2 block">Product Images</Label>
                    {/* Mode toggle */}
                    <div className="flex gap-1 p-1 bg-muted rounded-lg mb-3 w-fit">
                      <button type="button" onClick={() => setImageMode("url")}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${imageMode === "url" ? "bg-white text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}>
                        <Link2 className="w-3 h-3" /> Paste URL
                      </button>
                      <button type="button" onClick={() => setImageMode("upload")}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${imageMode === "upload" ? "bg-white text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}>
                        <Upload className="w-3 h-3" /> Upload File
                      </button>
                    </div>

                    {imageMode === "url" ? (
                      <div className="flex gap-2">
                        <Input value={imageUrl} onChange={e => setImageUrl(e.target.value)} placeholder="https://example.com/image.jpg" className="flex-1" onKeyDown={e => e.key === "Enter" && (e.preventDefault(), addImage())} />
                        <Button type="button" variant="outline" onClick={addImage} size="sm" className="gap-1 shrink-0"><ImagePlus className="w-3.5 h-3.5" /> Add</Button>
                      </div>
                    ) : (
                      <label className={`flex flex-col items-center justify-center w-full h-24 border-2 border-dashed border-border rounded-lg cursor-pointer hover:border-primary hover:bg-primary/5 transition-all ${uploadingImage ? "opacity-60 pointer-events-none" : ""}`}>
                        {uploadingImage ? (
                          <><Loader2 className="w-5 h-5 animate-spin text-primary mb-1" /><span className="text-xs text-muted-foreground">Uploading...</span></>
                        ) : (
                          <><Upload className="w-5 h-5 text-muted-foreground mb-1" /><span className="text-xs text-muted-foreground">Click to upload image</span><span className="text-[10px] text-muted-foreground/70 mt-0.5">JPG, PNG, WEBP up to 10MB</span></>
                        )}
                        <input type="file" accept="image/*" className="hidden" onChange={handleFileUpload} />
                      </label>
                    )}

                    {form.images.length > 0 && (
                      <DragDropContext onDragEnd={onDragEnd}>
                        <Droppable droppableId="seller-images" direction="horizontal">
                          {(provided) => (
                            <div ref={provided.innerRef} {...provided.droppableProps} className="flex gap-2 mt-3 flex-wrap">
                              {form.images.map((img, i) => (
                                <Draggable key={img + i} draggableId={`simg-${i}`} index={i}>
                                  {(drag, snapshot) => (
                                    <div
                                      ref={drag.innerRef}
                                      {...drag.draggableProps}
                                      style={{
                                        ...drag.draggableProps.style,
                                        opacity: 1,
                                        zIndex: snapshot.isDragging ? 60 : "auto",
                                      }}
                                      className={`relative group w-16 h-16 rounded-lg overflow-hidden border flex-shrink-0 bg-white shadow-sm ${
                                        snapshot.isDragging ? "border-primary shadow-xl ring-2 ring-primary/30" : "border-border"
                                      }`}
                                    >
                                      <FallbackImage src={img} alt="" className="w-full h-full object-cover" />
                                      <div {...drag.dragHandleProps} className={`absolute inset-0 bg-black/30 flex items-center justify-center cursor-grab transition-opacity ${
                                        snapshot.isDragging ? "opacity-100 cursor-grabbing" : "opacity-0 group-hover:opacity-100"
                                      }`}>
                                        <GripVertical className="w-5 h-5 text-white" />
                                      </div>
                                      <button type="button" onClick={() => removeImage(img)} className="absolute top-0.5 right-0.5 w-4 h-4 bg-red-500 rounded-full items-center justify-center hidden group-hover:flex">
                                        <X className="w-2.5 h-2.5 text-white" />
                                      </button>
                                      {i === 0 && <span className="absolute bottom-0 left-0 right-0 bg-black/50 text-white text-[8px] text-center py-0.5">Main</span>}
                                    </div>
                                  )}
                                </Draggable>
                              ))}
                              {provided.placeholder}
                            </div>
                          )}
                        </Droppable>
                      </DragDropContext>
                    )}
                  </div>
                  <div className="sm:col-span-2">
                    <Label className="text-xs font-medium">Product Video URL (optional)</Label>
                    <Input value={form.video_url || ""} onChange={e => setForm({ ...form, video_url: e.target.value })} placeholder="YouTube link or direct .mp4 URL" className="mt-1" />
                    <p className="text-xs text-muted-foreground mt-1">Customers will see a video player in the product details page.</p>
                  </div>
                  <div className="sm:col-span-2 flex items-center gap-2">
                    <input type="checkbox" id="is_active" checked={form.is_active} onChange={e => setForm({ ...form, is_active: e.target.checked })} className="accent-primary" />
                    <Label htmlFor="is_active" className="text-sm cursor-pointer">Active listing (visible to customers once approved)</Label>
                  </div>
                </div>
                <div className="flex gap-3 pt-2">
                  <Button type="button" variant="outline" onClick={() => setShowForm(false)} className="flex-1">Cancel</Button>
                  <Button type="submit" disabled={saving} className="flex-1 bg-primary hover:bg-primary/90 gap-2">
                    {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                    {editing ? "Save Changes" : "Submit for Approval"}
                  </Button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Products list */}
        {products.length === 0 ? (
          <div className="bg-white rounded-xl border border-border p-16 text-center">
            <Package className="w-14 h-14 text-gray-200 mx-auto mb-4" />
            <p className="font-medium text-muted-foreground mb-4">No products yet. Add your first product!</p>
            <Button onClick={openCreate} className="bg-primary hover:bg-primary/90 gap-2"><Plus className="w-4 h-4" /> Add Product</Button>
          </div>
        ) : (
          <div className="bg-white rounded-xl border border-border overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-muted/30 border-b border-border">
                  <tr>
                    <th className="text-left text-xs font-semibold text-muted-foreground px-4 py-3">Product</th>
                    <th className="text-left text-xs font-semibold text-muted-foreground px-4 py-3">Category</th>
                    <th className="text-left text-xs font-semibold text-muted-foreground px-4 py-3">Price</th>
                    <th className="text-left text-xs font-semibold text-muted-foreground px-4 py-3">Stock</th>
                    <th className="text-left text-xs font-semibold text-muted-foreground px-4 py-3">Status</th>
                    <th className="text-left text-xs font-semibold text-muted-foreground px-4 py-3">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {products.map(p => (
                    <tr key={p.id} className="hover:bg-muted/20 transition-colors">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-gray-100 rounded-lg overflow-hidden flex-shrink-0">
                            <FallbackImage sources={getProductImageUrls(p)} alt="" className="w-full h-full object-cover" fallback={<Package className="w-5 h-5 m-2.5 text-gray-400" />} />
                          </div>
                          <div>
                            <p className="font-medium text-sm line-clamp-1 max-w-[180px]">{p.name}</p>
                            {p.sku && <p className="text-xs text-muted-foreground">SKU: {p.sku}</p>}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm text-muted-foreground">{p.category}</td>
                      <td className="px-4 py-3">
                        <div className="text-sm font-semibold">৳{p.price?.toLocaleString()}</div>
                        {p.compare_price && <div className="text-xs text-muted-foreground line-through">৳{p.compare_price?.toLocaleString()}</div>}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`text-xs font-semibold ${p.stock <= 0 ? "text-red-600" : p.stock <= 5 ? "text-yellow-600" : "text-green-600"}`}>{p.stock}</span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full capitalize ${STATUS_COLORS[p.approval_status] || "bg-gray-100 text-gray-600"}`}>
                          {p.approval_status}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex gap-1.5">
                          <button onClick={() => openEdit(p)} className="p-1.5 hover:bg-primary/10 hover:text-primary rounded-lg transition-colors">
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button onClick={() => openFlashRequest(p)} className="p-1.5 hover:bg-yellow-50 hover:text-yellow-600 rounded-lg transition-colors" title="Request Flash Sale">
                            <Zap className="w-3.5 h-3.5" />
                          </button>
                          <button onClick={() => handleDelete(p.id)} className="p-1.5 hover:bg-red-50 hover:text-red-600 rounded-lg transition-colors">
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Flash Sale Request Dialog */}
      <Dialog open={flashDialog} onOpenChange={setFlashDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle className="font-poppins flex items-center gap-2"><Zap className="w-4 h-4 text-yellow-500" /> Request Flash Sale</DialogTitle></DialogHeader>
          {flashProduct && (
            <div className="space-y-4">
              <div className="bg-muted rounded-xl p-3">
                <p className="font-semibold">{flashProduct.name}</p>
                <p className="text-muted-foreground text-sm">Original price: <strong>৳{flashProduct.price?.toLocaleString()}</strong></p>
              </div>
              <div>
                <Label className="text-sm">Requested Flash Price (৳) *</Label>
                <Input type="number" value={flashForm.requested_price} onChange={e => setFlashForm({ ...flashForm, requested_price: e.target.value })} className="mt-1" />
                {flashForm.requested_price && <p className="text-xs text-primary mt-1">Discount: {Math.round(((flashProduct.price - parseFloat(flashForm.requested_price || 0)) / flashProduct.price) * 100)}% off</p>}
              </div>
              <div>
                <Label className="text-sm">Start Time</Label>
                <Input type="datetime-local" value={flashForm.start_date} onChange={e => setFlashForm({ ...flashForm, start_date: e.target.value })} className="mt-1" />
              </div>
              <div>
                <Label className="text-sm">End Time *</Label>
                <Input type="datetime-local" value={flashForm.end_date} onChange={e => setFlashForm({ ...flashForm, end_date: e.target.value })} className="mt-1" />
              </div>
              <p className="text-xs text-muted-foreground">Your request will be reviewed by admin before going live.</p>
              <div className="flex gap-3">
                <Button variant="outline" onClick={() => setFlashDialog(false)} className="flex-1">Cancel</Button>
                <Button onClick={submitFlashRequest} disabled={flashSaving} className="flex-1 bg-yellow-500 hover:bg-yellow-600 text-white">
                  {flashSaving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Zap className="w-4 h-4 mr-2" />} Submit Request
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </SellerLayout>
  );
}
