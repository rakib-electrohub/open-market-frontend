import { useState, useEffect } from "react";
import { apiClient } from "@/api/apiClient";
import AdminLayout from "@/components/admin/AdminLayout";
import { useAppSettings } from "@/hooks/useAppSettings";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Plus, Search, Pencil, Trash2, Package, Loader2, Link2, Upload, X, GripVertical } from "lucide-react";
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";
import { usePersistentToast } from "@/components/ui/PersistentToast";
import FallbackImage from "@/components/ui/FallbackImage";
import RichTextEditor from "@/components/RichTextEditor";
import { uploadImageWithSizeCheck } from "@/utils/imageUpload";
import { getProductImageUrls } from "@/utils/imageUrls";
import { getCategoriesFromSettings, getMainCategories, getSubCategories, getCategoryDisplayLabel } from "@/utils/categories";
import { normalizeProductSpecifications, normalizeProductVariants } from "@/utils/productAttributes";

const EMPTY = { name: "", price: "", compare_price: "", category: "", main_category: "", subcategory: "", brand: "", sku: "", stock: "", description: "", short_description: "", images: [], variants: [], specifications: [], video_url: "", is_active: true, is_featured: false, approval_status: "approved" };

export default function AdminProducts() {
  const settings = useAppSettings();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false);
  const [categoryOptions, setCategoryOptions] = useState([]);
  const [imageInput, setImageInput] = useState("");
  const [imageMode, setImageMode] = useState("url");
  const [uploadingImage, setUploadingImage] = useState(false);
  const notify = usePersistentToast();

  useEffect(() => {
    Promise.all([
      apiClient.entities.Product.list("-created_date", 200),
      apiClient.entities.Category.list("-created_date", 200),
    ]).then(([p, categories]) => {
      setProducts(p);
      setCategoryOptions(categories || []);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  const categories = getCategoriesFromSettings(settings);
  const mainCategories = getMainCategories(categoryOptions.length ? categoryOptions : categories.map((name) => ({ id: name, name, parent_id: null })));
  const subCategories = form.main_category ? getSubCategories(categoryOptions.length ? categoryOptions : [], mainCategories.find((cat) => cat.name === form.main_category)?.id) : [];
  const adminPickupEnabled = settings.store_pickup_enabled === true
    || String(settings.store_pickup_enabled).toLowerCase() === "true";
  const adminPickupAddressConfigured = Boolean(String(settings.admin_pickup_address || "").trim());
  const adminPickupReady = adminPickupEnabled && adminPickupAddressConfigured;

  const openCreate = () => {
    setEditing(null);
    setForm({
      ...EMPTY,
      store_pickup_enabled: settings.store_pickup_enabled === true
        || String(settings.store_pickup_enabled).toLowerCase() === "true",
    });
    setImageInput("");
    setImageMode("url");
    setDialogOpen(true);
  };
  const openEdit = (p) => {
    setEditing(p);
    setForm({
      ...EMPTY,
      ...p,
      store_pickup_enabled: p.store_pickup_enabled === undefined
        ? adminPickupEnabled
        : p.store_pickup_enabled === true || String(p.store_pickup_enabled).toLowerCase() === "true",
      main_category: p.main_category || (p.category && !p.subcategory ? p.category : ""),
      subcategory: p.subcategory || "",
      variants: normalizeProductVariants(p.variants).map((variant) => ({
        ...variant,
        options: variant.options.map((option) => ({ ...option, price_adjustment: option.price_adjustment ? String(option.price_adjustment) : "" })),
      })),
      specifications: normalizeProductSpecifications(p.specifications),
    });
    setImageInput("");
    setImageMode("url");
    setDialogOpen(true);
  };


  const handleSave = async () => {
    if (!form.name || !form.price) { notify("Name and price required", "error"); return; }
    setSaving(true);
    const categoryValue = getCategoryDisplayLabel(form.main_category, form.subcategory) || form.category;
    const variants = normalizeProductVariants(form.variants);
    const specifications = normalizeProductSpecifications(form.specifications);
    const data = { ...form, variants, specifications, category: categoryValue, main_category: form.main_category || "", subcategory: form.subcategory || "", price: parseFloat(form.price) || 0, compare_price: parseFloat(form.compare_price) || 0, stock: parseInt(form.stock) || 0 };
    try {
      if (editing) {
        const updated = await apiClient.entities.Product.update(editing.id, data);
        setProducts(products.map(p => p.id === editing.id ? updated : p));
        notify("Product updated!", "success");
      } else {
        const created = await apiClient.entities.Product.create(data);
        setProducts([created, ...products]);
        notify("Product created!", "success");
      }
      setDialogOpen(false);
    } catch (error) {
      notify(error.message || "Could not save product", "error");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm("Delete this product?")) return;
    await apiClient.entities.Product.delete(id);
    setProducts(products.filter(p => p.id !== id));
    notify("Product deleted", "delete");
  };

  const toggleApproval = async (p) => {
    const newStatus = p.approval_status === "approved" ? "rejected" : "approved";
    const updated = await apiClient.entities.Product.update(p.id, { approval_status: newStatus });
    setProducts(products.map(pr => pr.id === p.id ? updated : pr));
  };

  const addImage = () => {
    if (imageInput.trim()) { setForm(f => ({ ...f, images: [...(f.images || []), imageInput.trim()] })); setImageInput(""); }
  };

  const addVariant = () => setForm((current) => ({
    ...current,
    variants: [...(current.variants || []), { name: "", options: [] }],
  }));
  const updateVariant = (index, field, value) => setForm((current) => ({
    ...current,
    variants: current.variants.map((variant, variantIndex) => variantIndex === index ? { ...variant, [field]: value } : variant),
  }));
  const addVariantOption = (variantIndex) => setForm((current) => ({
    ...current,
    variants: current.variants.map((variant, index) => index === variantIndex
      ? { ...variant, options: [...variant.options, { value: "", price_adjustment: "" }] }
      : variant),
  }));
  const updateVariantOption = (variantIndex, optionIndex, field, value) => setForm((current) => ({
    ...current,
    variants: current.variants.map((variant, index) => index === variantIndex
      ? {
          ...variant,
          options: variant.options.map((option, nestedIndex) => nestedIndex === optionIndex
            ? { ...option, [field]: value }
            : option),
        }
      : variant),
  }));
  const removeVariantOption = (variantIndex, optionIndex) => setForm((current) => ({
    ...current,
    variants: current.variants.map((variant, index) => index === variantIndex
      ? { ...variant, options: variant.options.filter((_, nestedIndex) => nestedIndex !== optionIndex) }
      : variant),
  }));
  const removeVariant = (index) => setForm((current) => ({
    ...current,
    variants: current.variants.filter((_, variantIndex) => variantIndex !== index),
  }));
  const addSpecification = () => setForm((current) => ({
    ...current,
    specifications: [...(current.specifications || []), { name: "", value: "" }],
  }));
  const updateSpecification = (index, field, value) => setForm((current) => ({
    ...current,
    specifications: current.specifications.map((specification, specificationIndex) => specificationIndex === index
      ? { ...specification, [field]: value }
      : specification),
  }));
  const removeSpecification = (index) => setForm((current) => ({
    ...current,
    specifications: current.specifications.filter((_, specificationIndex) => specificationIndex !== index),
  }));

  const handleFileUpload = async (e) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    setUploadingImage(true);
    for (const file of files) {
      try {
        const { file_url } = await uploadImageWithSizeCheck(file, notify);
        setForm(f => ({ ...f, images: [...(f.images || []), file_url] }));
      } catch (error) {
        notify(error.message || 'File upload failed', 'error');
        break;
      }
    }
    setUploadingImage(false);
    e.target.value = "";
  };

  const onDragEnd = (result) => {
    if (!result.destination) return;
    const imgs = Array.from(form.images || []);
    const [moved] = imgs.splice(result.source.index, 1);
    imgs.splice(result.destination.index, 0, moved);
    setForm(f => ({ ...f, images: imgs }));
  };

  const removeImage = async (img) => {
    const wasAlreadySaved = editing?.images?.includes(img);
    setForm(f => ({ ...f, images: (f.images || []).filter(url => url !== img) }));
    if (!wasAlreadySaved) {
      await apiClient.integrations.Core.DeleteFile({ file_url: img }).catch(() => {});
    }
  };

  const filtered = products.filter((p) => {
    const needle = search.toLowerCase();
    return p.name?.toLowerCase().includes(needle)
      || p.category?.toLowerCase().includes(needle)
      || p.main_category?.toLowerCase().includes(needle)
      || p.subcategory?.toLowerCase().includes(needle)
      || p.sku?.toLowerCase().includes(needle);
  });

  return (
    <AdminLayout>
      <div className="space-y-5">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-white font-poppins font-bold text-xl">Products</h2>
            <p className="text-gray-400 text-sm">{products.length} total products</p>
          </div>
          <Button onClick={openCreate} className="bg-primary hover:bg-primary/90">
            <Plus className="w-4 h-4 mr-2" /> Add Product
          </Button>
        </div>

        <div className="relative">
          <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-500" />
          <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search products..." className="pl-9 bg-gray-800 border-gray-700 text-white placeholder:text-gray-500" />
        </div>

        <div className="bg-gray-900 rounded-2xl border border-gray-800 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr className="border-b border-gray-800">
                {["Product", "Category", "Price", "Stock", "Status", "Pickup", "Actions"].map(h => (
                  <th key={h} className="text-left px-4 py-3 text-gray-500 font-medium text-xs uppercase">{h}</th>
                ))}
              </tr></thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={7} className="text-center py-12"><Loader2 className="w-6 h-6 animate-spin text-primary mx-auto" /></td></tr>
                ) : filtered.map(p => (
                  <tr key={p.id} className="border-b border-gray-800/50 hover:bg-gray-800/30 transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-gray-800 rounded-lg overflow-hidden flex-shrink-0">
                          <FallbackImage sources={getProductImageUrls(p)} alt={p.name} className="w-full h-full object-cover" fallback={<Package className="w-5 h-5 m-2.5 text-gray-600" />} />
                        </div>
                        <div>
                          <div className="text-white font-medium line-clamp-1">{p.name}</div>
                          {p.brand && <div className="text-gray-500 text-xs">{p.brand}</div>}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-gray-400">{getCategoryDisplayLabel(p.main_category, p.subcategory) || p.category}</td>
                    <td className="px-4 py-3 text-white font-semibold">৳{p.price?.toLocaleString()}</td>
                    <td className="px-4 py-3">
                      <span className={`text-xs font-semibold ${p.stock === 0 ? "text-red-400" : p.stock < 10 ? "text-yellow-400" : "text-green-400"}`}>
                        {p.stock === 0 ? "Out of Stock" : p.stock}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <button onClick={() => toggleApproval(p)}
                        className={`text-xs font-semibold px-2 py-0.5 rounded-full ${p.approval_status === "approved" ? "bg-green-900/50 text-green-400" : p.approval_status === "pending" ? "bg-yellow-900/50 text-yellow-400" : "bg-red-900/50 text-red-400"}`}>
                        {p.approval_status}
                      </button>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-xs font-medium ${p.seller_id || !adminPickupReady || p.store_pickup_enabled === false || String(p.store_pickup_enabled).toLowerCase() === "false" ? "text-gray-500" : "text-green-400"}`}>
                        {p.seller_id
                          ? "Seller controlled"
                          : p.store_pickup_enabled === false || String(p.store_pickup_enabled).toLowerCase() === "false"
                            ? "Product disabled"
                            : !adminPickupEnabled
                              ? "Admin disabled"
                              : !adminPickupAddressConfigured
                                ? "Address needed"
                                : "Admin enabled"}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-1">
                        <button onClick={() => openEdit(p)} className="p-1.5 text-gray-400 hover:text-primary hover:bg-gray-800 rounded-lg transition-colors"><Pencil className="w-3.5 h-3.5" /></button>
                        <button onClick={() => handleDelete(p.id)} className="p-1.5 text-gray-400 hover:text-red-400 hover:bg-gray-800 rounded-lg transition-colors"><Trash2 className="w-3.5 h-3.5" /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Product Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto bg-gray-900 border-gray-800 text-white">
          <DialogHeader>
            <DialogTitle className="text-white font-poppins">{editing ? "Edit Product" : "Add New Product"}</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2"><Label className="text-gray-300">Product Name *</Label><Input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} className="mt-1 bg-gray-800 border-gray-700 text-white" placeholder="Product name" /></div>
            <div><Label className="text-gray-300">Price (৳) *</Label><Input type="number" value={form.price} onChange={e => setForm({ ...form, price: e.target.value })} className="mt-1 bg-gray-800 border-gray-700 text-white" /></div>
            <div><Label className="text-gray-300">Compare Price (৳)</Label><Input type="number" value={form.compare_price} onChange={e => setForm({ ...form, compare_price: e.target.value })} className="mt-1 bg-gray-800 border-gray-700 text-white" /></div>
            <div>
              <Label className="text-gray-300">Main Category</Label>
              <select value={form.main_category} onChange={e => setForm({ ...form, main_category: e.target.value, subcategory: "" })} className="mt-1 w-full border border-gray-700 rounded-md px-3 py-2 text-sm bg-gray-800 text-white focus:outline-none focus:ring-1 focus:ring-primary">
                <option value="">Select main category</option>
                {mainCategories.map(c => <option key={c.id || c.name} value={c.name}>{c.name}</option>)}
              </select>
            </div>
            <div>
              <Label className="text-gray-300">Sub Category</Label>
              <select value={form.subcategory} onChange={e => setForm({ ...form, subcategory: e.target.value })} disabled={!form.main_category} className="mt-1 w-full border border-gray-700 rounded-md px-3 py-2 text-sm bg-gray-800 text-white focus:outline-none focus:ring-1 focus:ring-primary disabled:opacity-60">
                <option value="">None</option>
                {subCategories.map(c => <option key={c.id || c.name} value={c.name}>{c.name}</option>)}
              </select>
            </div>
            <div><Label className="text-gray-300">Brand</Label><Input value={form.brand} onChange={e => setForm({ ...form, brand: e.target.value })} className="mt-1 bg-gray-800 border-gray-700 text-white" /></div>
            <div><Label className="text-gray-300">SKU</Label><Input value={form.sku} onChange={e => setForm({ ...form, sku: e.target.value })} className="mt-1 bg-gray-800 border-gray-700 text-white" /></div>
            <div><Label className="text-gray-300">Stock</Label><Input type="number" value={form.stock} onChange={e => setForm({ ...form, stock: e.target.value })} className="mt-1 bg-gray-800 border-gray-700 text-white" /></div>
            <div className="sm:col-span-2">
              <div className="flex items-center justify-between mb-2">
                <div>
                  <Label className="text-gray-300">Product Variants</Label>
                  <p className="text-xs text-gray-500 mt-1">Add choices and optional price adjustments. Leave the adjustment at 0 to keep the base price.</p>
                </div>
                <Button type="button" variant="outline" size="sm" onClick={addVariant} className="border-gray-700 text-gray-300">
                  <Plus className="w-3.5 h-3.5 mr-1" /> Add
                </Button>
              </div>
              <div className="space-y-2">
                {(form.variants || []).map((variant, index) => (
                  <div key={`variant-${index}`} className="space-y-2 rounded-lg border border-gray-800 p-3">
                    <div className="flex gap-2">
                      <Input value={variant.name} onChange={(event) => updateVariant(index, "name", event.target.value)} aria-label={`Variant ${index + 1} name`} placeholder="e.g. Color" className="bg-gray-800 border-gray-700 text-white" />
                      <button type="button" onClick={() => removeVariant(index)} aria-label="Remove variant" className="p-2 text-gray-400 hover:text-red-400"><Trash2 className="w-4 h-4" /></button>
                    </div>
                    {variant.options.map((option, optionIndex) => (
                      <div key={`option-${optionIndex}`} className="grid grid-cols-[2fr_1fr_auto] gap-2">
                        <Input value={option.value} onChange={(event) => updateVariantOption(index, optionIndex, "value", event.target.value)} aria-label={`${variant.name || `Variant ${index + 1}`} option ${optionIndex + 1}`} placeholder="e.g. Blue" className="bg-gray-800 border-gray-700 text-white" />
                        <Input type="number" value={option.price_adjustment} onChange={(event) => updateVariantOption(index, optionIndex, "price_adjustment", event.target.value)} aria-label={`${option.value || "Option"} price adjustment`} placeholder="Extra ৳ (0)" className="bg-gray-800 border-gray-700 text-white" />
                        <button type="button" onClick={() => removeVariantOption(index, optionIndex)} aria-label="Remove option" className="p-2 text-gray-400 hover:text-red-400"><X className="w-4 h-4" /></button>
                      </div>
                    ))}
                    <Button type="button" variant="outline" size="sm" onClick={() => addVariantOption(index)} className="border-gray-700 text-gray-300">Add option</Button>
                  </div>
                ))}
              </div>
            </div>
            <div className="sm:col-span-2">
              <div className="flex items-center justify-between mb-2">
                <div>
                  <Label className="text-gray-300">Specifications</Label>
                  <p className="text-xs text-gray-500 mt-1">Add product details such as Material, Model, or Warranty.</p>
                </div>
                <Button type="button" variant="outline" size="sm" onClick={addSpecification} className="border-gray-700 text-gray-300">
                  <Plus className="w-3.5 h-3.5 mr-1" /> Add
                </Button>
              </div>
              <div className="space-y-2">
                {(form.specifications || []).map((specification, index) => (
                  <div key={`specification-${index}`} className="grid grid-cols-[1fr_2fr_auto] gap-2 items-center">
                    <Input
                      value={specification.name}
                      onChange={(event) => updateSpecification(index, "name", event.target.value)}
                      aria-label={`Specification ${index + 1} name`}
                      placeholder="e.g. Material"
                      className="bg-gray-800 border-gray-700 text-white"
                    />
                    <Input
                      value={specification.value}
                      onChange={(event) => updateSpecification(index, "value", event.target.value)}
                      aria-label={`${specification.name || `Specification ${index + 1}`} value`}
                      placeholder="e.g. Aluminum"
                      className="bg-gray-800 border-gray-700 text-white"
                    />
                    <button type="button" onClick={() => removeSpecification(index)} aria-label="Remove specification" className="p-2 text-gray-400 hover:text-red-400">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
            <div className="sm:col-span-2">
              <Label className="text-gray-300">Short Description</Label>
              <RichTextEditor value={form.short_description} onChange={value => setForm({ ...form, short_description: value })} minHeight={140} />
            </div>
            <div className="sm:col-span-2">
              <Label className="text-gray-300">Description</Label>
              <RichTextEditor value={form.description} onChange={value => setForm({ ...form, description: value })} minHeight={260} />
            </div>
            <div className="sm:col-span-2">
              <Label className="text-gray-300 mb-2 block">Product Images <span className="text-gray-500 text-xs font-normal">(first image = main. drag to reorder)</span></Label>
              {/* Mode toggle */}
              <div className="flex gap-1 p-1 bg-gray-800 rounded-lg mb-3 w-fit">
                <button type="button" onClick={() => setImageMode("url")}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${imageMode === "url" ? "bg-gray-700 text-white" : "text-gray-500 hover:text-gray-300"}`}>
                  <Link2 className="w-3 h-3" /> Paste URL
                </button>
                <button type="button" onClick={() => setImageMode("upload")}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${imageMode === "upload" ? "bg-gray-700 text-white" : "text-gray-500 hover:text-gray-300"}`}>
                  <Upload className="w-3 h-3" /> Upload Files
                </button>
              </div>
              {imageMode === "url" ? (
                <div className="flex gap-2">
                  <Input value={imageInput} onChange={e => setImageInput(e.target.value)} placeholder="https://..." className="bg-gray-800 border-gray-700 text-white" onKeyDown={e => e.key === "Enter" && (e.preventDefault(), addImage())} />
                  <Button type="button" onClick={addImage} size="sm" className="bg-primary hover:bg-primary/90 shrink-0">Add</Button>
                </div>
              ) : (
                <label className={`flex flex-col items-center justify-center w-full h-24 border-2 border-dashed border-gray-700 rounded-lg cursor-pointer hover:border-primary hover:bg-primary/5 transition-all ${uploadingImage ? "opacity-60 pointer-events-none" : ""}`}>
                  {uploadingImage ? (
                    <><Loader2 className="w-5 h-5 animate-spin text-primary mb-1" /><span className="text-xs text-gray-400">Uploading...</span></>
                  ) : (
                    <><Upload className="w-5 h-5 text-gray-500 mb-1" /><span className="text-xs text-gray-400">Click to upload (select multiple)</span></>
                  )}
                  <input type="file" accept="image/*" multiple className="hidden" onChange={handleFileUpload} />
                </label>
              )}
              {/* Draggable thumbnails */}
              {form.images?.length > 0 && (
                <DragDropContext onDragEnd={onDragEnd}>
                  <Droppable droppableId="images" direction="horizontal">
                    {(provided) => (
                      <div ref={provided.innerRef} {...provided.droppableProps} className="flex gap-2 mt-3 flex-wrap">
                        {form.images.map((img, i) => (
                          <Draggable key={img + i} draggableId={`img-${i}`} index={i}>
                            {(drag, snapshot) => (
                              <div
                                ref={drag.innerRef}
                                {...drag.draggableProps}
                                style={{
                                  ...drag.draggableProps.style,
                                  opacity: 1,
                                  zIndex: snapshot.isDragging ? 60 : "auto",
                                }}
                                className={`relative group w-16 h-16 rounded-lg overflow-hidden border-2 flex-shrink-0 bg-gray-900 shadow-sm ${
                                  snapshot.isDragging ? "border-primary shadow-xl ring-2 ring-primary/40" : "border-gray-700"
                                }`}
                              >
                                <FallbackImage src={img} alt="" className="w-full h-full object-cover" />
                                <div {...drag.dragHandleProps} className={`absolute inset-0 bg-black/30 flex items-center justify-center cursor-grab transition-opacity ${
                                  snapshot.isDragging ? "opacity-100 cursor-grabbing" : "opacity-0 group-hover:opacity-100"
                                }`}>
                                  <GripVertical className="w-5 h-5 text-white" />
                                </div>
                                <button type="button" onClick={() => removeImage(img)}
                                  className="absolute top-0.5 right-0.5 bg-red-500 rounded-full w-4 h-4 items-center justify-center text-white hidden group-hover:flex">
                                  <X className="w-2.5 h-2.5" />
                                </button>
                                {i === 0 && <span className="absolute bottom-0 left-0 right-0 bg-black/60 text-white text-[8px] text-center py-0.5">MAIN</span>}
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
              <Label className="text-gray-300">Product Video URL (YouTube or direct link) — optional</Label>
              <Input value={form.video_url || ""} onChange={e => setForm({ ...form, video_url: e.target.value })} placeholder="https://youtube.com/watch?v=... or https://example.com/video.mp4" className="mt-1 bg-gray-800 border-gray-700 text-white" />
            </div>
            <div className="flex items-center gap-4">
              <label className="flex items-center gap-2 cursor-pointer"><input type="checkbox" checked={form.is_active} onChange={e => setForm({ ...form, is_active: e.target.checked })} className="accent-primary" /><span className="text-gray-300 text-sm">Active</span></label>
              <label className="flex items-center gap-2 cursor-pointer"><input type="checkbox" checked={form.is_featured} onChange={e => setForm({ ...form, is_featured: e.target.checked })} className="accent-primary" /><span className="text-gray-300 text-sm">Featured</span></label>
            </div>
            <div className="sm:col-span-2 rounded-lg border border-gray-800 p-3 text-xs text-gray-400">
              New admin products default to pickup enabled when the global setting is on. You can disable pickup for this product here. Seller products follow the seller&apos;s pickup settings.
            </div>
            <label className="sm:col-span-2 flex cursor-pointer items-start gap-2 rounded-lg border border-gray-800 p-3">
              <input
                type="checkbox"
                checked={form.store_pickup_enabled === true || String(form.store_pickup_enabled).toLowerCase() === "true"}
                onChange={(event) => setForm({ ...form, store_pickup_enabled: event.target.checked })}
                className="mt-1 accent-primary"
              />
              <span>
                <span className="block text-sm font-medium text-gray-200">Allow pickup for this admin product</span>
                <span className="mt-1 block text-xs text-gray-400">Pickup also requires the marketplace setting and admin pickup address.</span>
              </span>
            </label>
          </div>
          <div className="flex justify-end gap-3 mt-4">
            <Button variant="outline" onClick={() => setDialogOpen(false)} className="border-gray-700 text-gray-300">Cancel</Button>
            <Button onClick={handleSave} disabled={saving} className="bg-primary hover:bg-primary/90">
              {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}{editing ? "Save Changes" : "Create Product"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
