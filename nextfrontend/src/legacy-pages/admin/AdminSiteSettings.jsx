import { useState, useEffect, useRef } from "react";
import { apiClient } from "@/api/apiClient";
import AdminLayout from "@/components/admin/AdminLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Save, Store, Phone, Mail, MapPin, Globe, Facebook, Instagram, Youtube, Upload, Trash2 } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { useAuth } from "@/lib/AuthContext";
import RichTextEditor from "@/components/RichTextEditor";
import { normalizeImageUrl } from "@/utils/imageUrls";
import { uploadImageWithSizeCheck } from "@/utils/imageUpload";
import { buildCategoryTree, parseCategoryList } from "@/utils/categories";
import { getSafeHttpUrl } from "@/utils/urls";

const DEFAULT_SETTINGS = {
  store_name: "Open Market BD",
  store_tagline: "Bangladesh's Modern Marketplace",
  store_logo: "",
  contact_phone: "+880 1700-000000",
  contact_hours: "09:00 AM to 10:00 PM",
  whatsapp_number: "",
  whatsapp_url: "",
  imo_number: "",
  imo_url: "",
  facebook_messenger_url: "",
  contact_email: "support@openmarketbd.com",
  contact_address: "Dhaka, Bangladesh",
  iottechbd_url: "https://iottechbd.com",
  developer_credit_text: "Developed by IoT-TechBD",
  developer_credit_url: "https://iottechbd.com",
  printing_service_url: "",
  facebook_url: "",
  instagram_url: "",
  youtube_url: "",
  website_url: "",
  announcement_text: "🎉 Free delivery on orders above ৳999 | Cash on Delivery Available Nationwide",
  home_intro_eyebrow: "Why shoppers choose us",
  home_intro_title: "Your trusted marketplace for smarter shopping",
  home_intro_description: "Discover premium essentials, trending products, and verified sellers in one secure shopping destination built for speed, value, and confidence.",
  home_benefit_1_title: "3D Printing Service",
  home_benefit_1_description: "Custom 3D printing solutions",
  home_benefit_2_title: "Secure Payment",
  home_benefit_2_description: "100% protected",
  home_benefit_3_title: "Product Tested",
  home_benefit_3_description: "Every product is tested before delivery",
  home_benefit_4_title: "Contact Us",
  home_benefit_4_description: "",
  return_policy: "We offer a 7-day return policy for all products. Items must be in original condition.",
  privacy_policy: "We respect your privacy. Your personal information is kept secure and never shared.",
  terms_conditions: "By using Open Market BD, you agree to our terms and conditions.",
  shipping_info: "Standard delivery: 2-5 business days. Express delivery available in Dhaka.",
  home_products_limit: "10",
  max_image_size_mb: "2",
  delivery_locations_json: JSON.stringify({
    divisions: [
      {
        id: "dhaka",
        name: "Dhaka",
        districts: [
          {
            id: "gazipur",
            name: "Gazipur",
            default_fee: 80,
            fast_fee: 120,
            areas: [
              {
                id: "gazipur-sadar",
                name: "Gazipur Sadar",
                default_fee: 60,
                fast_fee: 90,
              },
            ],
          },
        ],
      },
    ],
    unknown_area_fee: {
      default_fee: 150,
      fast_fee: 200,
    },
  }),
};

export default function AdminSiteSettings() {
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);
  const [records, setRecords] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState("general");

  const [newCategory, setNewCategory] = useState("");
  const [categoryList, setCategoryList] = useState([]);
  const [categoryForm, setCategoryForm] = useState({ name: "", parent_id: "", image: "", status: "active" });
  const [editingCategoryId, setEditingCategoryId] = useState(null);
  const [categorySaving, setCategorySaving] = useState(false);
  const [categoryUploading, setCategoryUploading] = useState(false);
    
  const [deliveryLocations, setDeliveryLocations] = useState(
    JSON.parse(DEFAULT_SETTINGS.delivery_locations_json)
  );

  const [selectedDivision, setSelectedDivision] = useState("");
  const [selectedDistrict, setSelectedDistrict] = useState("");
  const [selectedArea, setSelectedArea] = useState("");

  const [newDivision, setNewDivision] = useState("");
  const [newDistrict, setNewDistrict] = useState("");
  const [newArea, setNewArea] = useState("");

  
  const { toast } = useToast();
  const { refreshPublicSettings } = useAuth();




  useEffect(() => {
    apiClient.entities.SiteSettings.list().then(all => {
      const map = {};

      all.forEach(r => {
        if (map[r.key] === undefined) {
          map[r.key] = r;
        }
      });

      setRecords(map);

      const vals = { ...DEFAULT_SETTINGS };

      Object.keys(DEFAULT_SETTINGS).forEach(key => {
        if (map[key]) {
          vals[key] = map[key].value;
        }
      });

      setSettings(vals);
      // categoryList will be loaded from Category entities via loadCategoryData
      setCategoryList([]);

      // Delivery Locations Load
      if (map.delivery_locations_json?.value) {
        try {
          setDeliveryLocations(
            JSON.parse(map.delivery_locations_json.value)
          );
        } catch (err) {
          console.error(
            "delivery_locations_json parse error",
            err
          );
        }
      }

      setLoading(false);
    });
  }, []);

  const loadCategoryData = async () => {
    try {
      const categories = await apiClient.entities.Category.list("-created_date", 200);
      setCategoryList((categories || []).map((entry) => ({ ...entry, name: entry.name || entry.title || "" })));
    
    } catch (error) {
      console.error(error);
    }
  };

  useEffect(() => {
    loadCategoryData();
  }, []);

  const treeCategories = buildCategoryTree(categoryList);

  const resetCategoryForm = () => {
    setEditingCategoryId(null);
    setCategoryForm({ name: "", parent_id: "", image: "", status: "active" });
  };

  const handleCategorySubmit = async (e) => {
    e.preventDefault();
    if (!categoryForm.name.trim()) return;
    setCategorySaving(true);
    try {
      const payload = {
        name: categoryForm.name.trim(),
        slug: categoryForm.name.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, ""),
        parent_id: categoryForm.parent_id || null,
        image: categoryForm.image || "",
        status: categoryForm.status || "active",
        is_active: categoryForm.status !== "inactive",
      };
      if (editingCategoryId) {
        await apiClient.entities.Category.update(editingCategoryId, payload);
      } else {
        await apiClient.entities.Category.create(payload);
      }
      await loadCategoryData();
      resetCategoryForm();
      toast({ title: editingCategoryId ? "Category updated" : "Category created" });
    } catch (error) {
      toast({ title: error.message || "Failed to save category", variant: "destructive" });
    } finally {
      setCategorySaving(false);
    }
  };

  const handleEditCategory = (category) => {
    setEditingCategoryId(category.id);
    setCategoryForm({
      name: category.name || "",
      parent_id: category.parent_id || "",
      image: category.image || "",
      status: category.status || (category.is_active === false ? "inactive" : "active"),
    });
  };

  const handleDeleteCategory = async (category) => {
    if (!window.confirm(`Delete ${category.name}?`)) return;
    try {
      await apiClient.entities.Category.delete(category.id);
      await loadCategoryData();
      if (editingCategoryId === category.id) resetCategoryForm();
      toast({ title: "Category deleted" });
    } catch (error) {
      toast({ title: error.message || "Failed to delete category", variant: "destructive" });
    }
  };

  const handleCategoryImageUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setCategoryUploading(true);
    try {
      const { file_url } = await uploadImageWithSizeCheck(file, (message) => toast({ title: message, variant: "destructive" }));
      setCategoryForm((prev) => ({ ...prev, image: file_url }));
    } catch (error) {
      toast({ title: error.message || "Image upload failed", variant: "destructive" });
    } finally {
      setCategoryUploading(false);
      e.target.value = "";
    }
  };
  
  const handleSave = async (keys) => {
    const invalidLink = keys.find((key) =>
      [
        "iottechbd_url",
        "developer_credit_url",
        "printing_service_url",
        "whatsapp_url",
        "imo_url",
        "facebook_messenger_url",
      ].includes(key) &&
      settings[key] &&
      !getSafeHttpUrl(settings[key])
    );
    if (invalidLink) {
      toast({ title: "Enter a valid website URL starting with http:// or https://", variant: "destructive" });
      return;
    }

    setSaving(true);

    try {
      for (const key of keys) {
        if (records[key]) {
          await apiClient.entities.SiteSettings.update(records[key].id, { value: settings[key] });
        } else {
          const created = await apiClient.entities.SiteSettings.create({ key, value: settings[key], type: "text", label: key });
          setRecords(r => ({ ...r, [key]: created }));
        }
      }

      await refreshPublicSettings?.();
      toast({ title: "Settings saved!" });
    } finally {
      setSaving(false);
    }
  };

  const handleSaveValues = async (values, keys) => {
    setSaving(true);

    try {
      for (const key of keys) {
        if (records[key]) {
          await apiClient.entities.SiteSettings.update(records[key].id, { value: values[key] });
        } else {
          const created = await apiClient.entities.SiteSettings.create({ key, value: values[key], type: "text", label: key });
          setRecords(r => ({ ...r, [key]: created }));
        }
      }

      await refreshPublicSettings?.();
      toast({ title: "Settings saved!" });
    } finally {
      setSaving(false);
    }
  };

  const getId = () => {
    if (typeof crypto !== "undefined" && crypto.randomUUID) {
      return crypto.randomUUID();
    }

    return `zone-${Date.now()}-${Math.random().toString(16).slice(2)}`;
  };

  const confirmDelete = (message) => window.confirm(message);


  

  const ImageUploadField = ({ label, name, placeholder }) => {
    const fileRef = useRef();
    const [uploading, setUploading] = useState(false);
    const handleFile = async (e) => {
      const file = e.target.files[0];
      if (!file) return;
      setUploading(true);
      try {
        const { file_url } = await uploadImageWithSizeCheck(file, (message) => toast({ title: message, variant: 'destructive' }));
        setSettings(s => ({ ...s, [name]: file_url }));
      } catch (error) {
        toast({ title: error.message || 'File upload failed', variant: 'destructive' });
      }
      setUploading(false);
    };
    return (
      <div>
        <Label className="text-gray-300">{label}</Label>
        <div className="mt-1.5 flex gap-2">
          <Input
            value={settings[name] || ""}
            onChange={e => setSettings({ ...settings, [name]: e.target.value })}
            placeholder={placeholder}
            className="flex-1 bg-gray-800 border-gray-700 text-white placeholder:text-gray-600"
          />
          <button onClick={() => fileRef.current?.click()}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-700 hover:bg-gray-600 text-gray-300 rounded-md text-xs border border-gray-600 transition-colors whitespace-nowrap">
            {uploading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />}
            Upload
          </button>
          <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleFile} />
        </div>
      </div>
    );
  };

  const Field = ({ label, name, type = "text", icon: Icon, placeholder }) => (
    <div>
      <Label className="text-gray-300 flex items-center gap-1.5">{Icon && <Icon className="w-3.5 h-3.5 text-gray-500" />}{label}</Label>
      <Input
        type={type}
        value={settings[name] || ""}
        onChange={e => setSettings({ ...settings, [name]: e.target.value })}
        placeholder={placeholder}
        className="mt-1.5 bg-gray-800 border-gray-700 text-white placeholder:text-gray-600"
      />
    </div>
  );

  const TextArea = ({ label, name, rows = 4, richText = false }) => (
    <div>
      <Label className="text-gray-300">{label}</Label>
      {richText ? (
        <div className="mt-1.5">
          <RichTextEditor
            value={settings[name] || ""}
            onChange={value => setSettings({ ...settings, [name]: value })}
            minHeight={Math.max(180, rows * 34)}
          />
        </div>
      ) : (
        <textarea
          value={settings[name] || ""}
          onChange={e => setSettings({ ...settings, [name]: e.target.value })}
          rows={rows}
          className="mt-1.5 w-full border border-gray-700 rounded-md px-3 py-2 text-sm bg-gray-800 text-white focus:outline-none focus:ring-1 focus:ring-primary resize-none"
        />
      )}
    </div>
  );

  const addDivision = () => {
    if (!newDivision.trim()) return;

    setDeliveryLocations(prev => ({
      ...prev,
      divisions: [
        ...prev.divisions,
        {
          id: getId(),
          name: newDivision,
          districts: [],
        },
      ],
    }));

    setNewDivision("");
  };

  const deleteDivision = (divisionId) => {
    if (!confirmDelete("Delete this division and all its districts and areas?")) return;

    setDeliveryLocations(prev => ({
      ...prev,
      divisions: prev.divisions.filter(d => d.id !== divisionId),
    }));

    if (selectedDivision === divisionId) {
      setSelectedDivision("");
      setSelectedDistrict("");
      setSelectedArea("");
    }
  };

  const updateDivisionName = (divisionId, value) => {
    setDeliveryLocations(prev => ({
      ...prev,
      divisions: prev.divisions.map(d =>
        d.id === divisionId ? { ...d, name: value } : d
      ),
    }));
  };

  const addDistrict = () => {
    if (!selectedDivision || !newDistrict.trim()) return;

    setDeliveryLocations(prev => ({
      ...prev,
      divisions: prev.divisions.map(div =>
        div.id === selectedDivision
          ? {
              ...div,
              districts: [
                ...div.districts,
                {
                  id: getId(),
                  name: newDistrict,
                  default_fee: 0,
                  fast_fee: 0,
                  areas: [],
                },
              ],
            }
          : div
      ),
    }));

    setNewDistrict("");
  };

  const deleteDistrict = (divisionId, districtId) => {
    if (!confirmDelete("Delete this district and all its areas?")) return;

    setDeliveryLocations(prev => ({
      ...prev,
      divisions: prev.divisions.map(d =>
        d.id === divisionId
          ? {
              ...d,
              districts: d.districts.filter(x => x.id !== districtId),
            }
          : d
      ),
    }));

    if (selectedDistrict === districtId) {
      setSelectedDistrict("");
      setSelectedArea("");
    }
  };

  const updateDistrictName = (divisionId, districtId, value) => {
    setDeliveryLocations(prev => ({
      ...prev,
      divisions: prev.divisions.map(d =>
        d.id === divisionId
          ? {
              ...d,
              districts: d.districts.map(x =>
                x.id === districtId
                  ? { ...x, name: value }
                  : x
              ),
            }
          : d
      ),
    }));
  };

  const addArea = () => {
    if (
      !selectedDivision ||
      !selectedDistrict ||
      !newArea.trim()
    ) return;

    setDeliveryLocations(prev => ({
      ...prev,
      divisions: prev.divisions.map(div =>
        div.id === selectedDivision
          ? {
              ...div,
              districts: div.districts.map(dist =>
                dist.id === selectedDistrict
                  ? {
                      ...dist,
                      areas: [
                        ...dist.areas,
                        {
                          id: getId(),
                          name: newArea,
                          default_fee: 0,
                          fast_fee: 0,
                        },
                      ],
                    }
                  : dist
              ),
            }
          : div
      ),
    }));

    setNewArea("");
  };

  const deleteArea = (divisionId, districtId, areaId) => {
    if (!confirmDelete("Delete this area?")) return;

    setDeliveryLocations(prev => ({
      ...prev,
      divisions: prev.divisions.map(d =>
        d.id === divisionId
          ? {
              ...d,
              districts: d.districts.map(x =>
                x.id === districtId
                  ? {
                      ...x,
                      areas: x.areas.filter(a => a.id !== areaId),
                    }
                  : x
              ),
            }
          : d
      ),
    }));

    if (selectedArea === areaId) {
      setSelectedArea("");
    }
  };

  const updateAreaField = (
    divisionId,
    districtId,
    areaId,
    field,
    value
  ) => {
    const nextValue = field.includes("fee") ? Number(value) : value;

    setDeliveryLocations(prev => ({
      ...prev,
      divisions: prev.divisions.map(div =>
        div.id === divisionId
          ? {
              ...div,
              districts: div.districts.map(dist =>
                dist.id === districtId
                  ? {
                      ...dist,
                      areas: dist.areas.map(area =>
                        area.id === areaId
                          ? {
                              ...area,
                              [field]: nextValue,
                            }
                          : area
                      ),
                    }
                  : dist
              ),
            }
          : div
      ),
    }));
  };

  const updateDistrictFee = (
    divisionId,
    districtId,
    field,
    value
  ) => {
    setDeliveryLocations(prev => ({
      ...prev,
      divisions: prev.divisions.map(div =>
        div.id === divisionId
          ? {
              ...div,
              districts: div.districts.map(dist =>
                dist.id === districtId
                  ? {
                      ...dist,
                      [field]: Number(value),
                    }
                  : dist
              ),
            }
          : div
      ),
    }));
  };

  const updateUnknownFee = (
    field,
    value
  ) => {
    setDeliveryLocations(prev => ({
      ...prev,
      unknown_area_fee: {
        ...prev.unknown_area_fee,
        [field]: Number(value),
      },
    }));
  };

  const TABS = [
    { id: "general", label: "General" },
    { id: "contact", label: "Contact" },
    { id: "social", label: "Social Media" },
    { id: "policies", label: "Policies" },
    { id: "uploads", label: "Upload Limits" },
    { id: "categories", label: "Product Categories" },
    {id : "deliveryzones", label : "Delivery Zones"},
  ];

  const TAB_KEYS = {
    general: [
      "store_name", "store_tagline", "store_logo", "announcement_text", "home_products_limit",
      "home_intro_eyebrow", "home_intro_title", "home_intro_description",
      "home_benefit_1_title", "home_benefit_1_description",
      "home_benefit_2_title", "home_benefit_2_description",
      "home_benefit_3_title", "home_benefit_3_description",
      "home_benefit_4_title", "home_benefit_4_description",
    ],
    contact: [
      "contact_phone", "contact_hours", "whatsapp_number", "whatsapp_url",
      "imo_number", "imo_url", "facebook_messenger_url", "contact_email",
      "contact_address", "website_url", "iottechbd_url", "printing_service_url",
      "developer_credit_text", "developer_credit_url",
    ],
    social: ["facebook_url", "instagram_url", "youtube_url"],
    policies: ["return_policy", "privacy_policy", "terms_conditions", "shipping_info"],
    uploads: ["max_image_size_mb"],
    categories: [],
    deliveryzones: ["delivery_locations_json"],
  };

  return (
    <AdminLayout>
      <div className="space-y-5 max-w-4xl">
        {/*space-y-5 max-w-4xl is for screen width  */}
        <div>
          <h2 className="text-white font-poppins font-bold text-xl flex items-center gap-2"><Store className="w-5 h-5 text-primary" /> Site Settings</h2>
          <p className="text-gray-400 text-sm">Manage your store's identity, contact info, and policies</p>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 bg-gray-800 p-1 rounded-xl">
          {TABS.map(t => (
            <button key={t.id} onClick={() => setActiveTab(t.id)}
              className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-semibold transition-colors ${activeTab === t.id ? "bg-primary text-white" : "text-gray-400 hover:text-white"}`}>
              {t.label}
            </button>
          ))}
        </div>

        {loading ? <div className="flex justify-center py-10"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div> : (
          <div className="bg-gray-900 rounded-2xl border border-gray-800 p-5 space-y-4">
            {activeTab === "general" && (<>
              <Field label="Store Name" name="store_name" icon={Store} placeholder="Open Market BD" />
              <Field label="Tagline" name="store_tagline" placeholder="Bangladesh's Modern Marketplace" />
              <ImageUploadField label="Store Logo" name="store_logo" placeholder="https://your-logo-url.com/logo.png" />
              {settings.store_logo && <div className="flex items-center gap-3 p-3 bg-gray-800 rounded-xl"><img src={normalizeImageUrl(settings.store_logo)} alt="Logo" className="w-16 h-16 object-contain rounded-lg" /><p className="text-gray-400 text-sm">Logo preview</p></div>}
              <div>
                <label className="text-gray-300 text-sm font-medium block mb-1">Announcement Bar Text</label>
                <p className="text-gray-500 text-xs mb-1.5">Separate multiple messages with <code className="bg-gray-800 px-1 rounded">|</code> — they will rotate with animations</p>
                <textarea
                  value={settings.announcement_text || ""}
                  onChange={e => setSettings({ ...settings, announcement_text: e.target.value })}
                  rows={3}
                  placeholder="🎉 Free delivery on orders above ৳999 | 🔥 Sale up to 50% off | 💳 Pay with bKash & Nagad"
                  className="w-full border border-gray-700 rounded-md px-3 py-2 text-sm bg-gray-800 text-white focus:outline-none focus:ring-1 focus:ring-primary resize-none"
                />
              </div>
              <div>
                <Label className="text-gray-300">Homepage Products Per Section</Label>
                <p className="text-gray-500 text-xs mt-0.5 mb-1.5">Controls how many products are requested for Featured, Trending, New Arrivals, and Flash Sales.</p>
                <Input
                  type="number"
                  min="1"
                  max="20"
                  value={settings.home_products_limit || "10"}
                  onChange={e => setSettings({ ...settings, home_products_limit: e.target.value })}
                  className="bg-gray-800 border-gray-700 text-white"
                />
              </div>
              <div className="border-t border-gray-800 pt-4 space-y-3">
                <div>
                  <h3 className="text-gray-200 text-sm font-semibold">Homepage Introduction</h3>
                  <p className="text-gray-500 text-xs mt-1">Edit the eyebrow, headline, and description shown below the homepage banner. The storefront layout remains unchanged.</p>
                </div>
                <Field label="Eyebrow" name="home_intro_eyebrow" placeholder="Why shoppers choose us" />
                <Field label="Headline" name="home_intro_title" placeholder="Your trusted marketplace for smarter shopping" />
                <TextArea label="Description" name="home_intro_description" rows={3} />
              </div>
              <div className="border-t border-gray-800 pt-4 space-y-4">
                <div>
                  <h3 className="text-gray-200 text-sm font-semibold">Homepage Benefit Cards</h3>
                  <p className="text-gray-500 text-xs mt-1">Edit the title and description shown on each homepage benefit card. The 3D Printing Service card uses the URL configured in Contact settings.</p>
                </div>
                {[1, 2, 3, 4].map((index) => (
                  <div key={index} className="grid gap-3 sm:grid-cols-2">
                    <Field label={`Benefit ${index} Title`} name={`home_benefit_${index}_title`} placeholder={`Benefit ${index} title`} />
                    {index === 4 ? (
                      <p className="self-end pb-2 text-xs text-gray-500">The Contact Us card displays Contact Availability Hours from Contact settings.</p>
                    ) : (
                      <Field label={`Benefit ${index} Description`} name={`home_benefit_${index}_description`} placeholder={`Benefit ${index} description`} />
                    )}
                  </div>
                ))}
              </div>
            </>)}

            {activeTab === "contact" && (<>
              <Field label="Phone" name="contact_phone" icon={Phone} placeholder="+880 1700-000000" />
              <Field label="Contact Availability Hours" name="contact_hours" placeholder="09:00 AM to 10:00 PM" />
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="WhatsApp Number" name="whatsapp_number" type="tel" placeholder="+880 1700-000000" />
                <Field label="WhatsApp Link (optional)" name="whatsapp_url" icon={Globe} type="url" placeholder="https://wa.me/8801700000000" />
              </div>
              <p className="-mt-3 text-xs text-gray-500">If the WhatsApp link is blank, it is generated from the number.</p>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="IMO Number" name="imo_number" type="tel" placeholder="+880 1700-000000" />
                <Field label="IMO Message Link" name="imo_url" icon={Globe} type="url" placeholder="https://..." />
              </div>
              <Field label="Facebook Messenger Link" name="facebook_messenger_url" icon={Facebook} type="url" placeholder="https://m.me/yourpage" />
              <Field label="Email" name="contact_email" icon={Mail} type="email" placeholder="support@store.com" />
              <Field label="Address" name="contact_address" icon={MapPin} placeholder="Dhaka, Bangladesh" />
              <Field label="Website URL" name="website_url" icon={Globe} placeholder="https://openmarketbd.com" />
              <Field label="IoT-TechBD Website URL" name="iottechbd_url" icon={Globe} type="url" placeholder="https://iottechbd.com" />
              <Field label="Developer Credit Button Text" name="developer_credit_text" placeholder="Developed by IoT-TechBD" />
              <Field label="Developer Credit Button URL" name="developer_credit_url" icon={Globe} type="url" placeholder="https://iottechbd.com" />
              <div>
                <Field label="3D Printing Service URL" name="printing_service_url" icon={Globe} type="url" placeholder="https://iottechbd.com/3d-printing" />
                <p className="mt-1 text-xs text-gray-500">Leave blank to hide the 3D Printing shortcut from the store.</p>
              </div>
            </>)}

            {activeTab === "social" && (<>
              <Field label="Facebook Page URL" name="facebook_url" icon={Facebook} placeholder="https://facebook.com/yourpage" />
              <Field label="Instagram URL" name="instagram_url" icon={Instagram} placeholder="https://instagram.com/yourhandle" />
              <Field label="YouTube Channel" name="youtube_url" icon={Youtube} placeholder="https://youtube.com/yourchannel" />
            </>)}

            {activeTab === "policies" && (<>
              <TextArea label="Return Policy" name="return_policy" rows={4} richText />
              <TextArea label="Privacy Policy" name="privacy_policy" rows={4} richText />
              <TextArea label="Terms & Conditions" name="terms_conditions" rows={4} richText />
              <TextArea label="Shipping Information" name="shipping_info" rows={3} richText />
            </>)}

            {activeTab === "uploads" && (<>
              <div>
                <Label className="text-gray-300">Maximum Image Upload Size (MB)</Label>
                <p className="text-gray-500 text-xs mt-0.5 mb-2">Sellers and users cannot upload images larger than this size. Recommended: 2–5 MB.</p>
                <div className="flex items-center gap-3">
                  <input
                    type="range" min="1" max="20" step="1"
                    value={settings.max_image_size_mb || "2"}
                    onChange={e => setSettings({ ...settings, max_image_size_mb: e.target.value })}
                    className="flex-1 accent-primary"
                  />
                  <span className="text-white font-bold text-lg w-16 text-right">{settings.max_image_size_mb || 2} MB</span>
                </div>
                <div className="flex justify-between text-xs text-gray-600 mt-1"><span>1 MB</span><span>20 MB</span></div>
              </div>
              <div className="bg-gray-800 rounded-xl p-4 text-sm text-gray-400">
                <p className="font-semibold text-gray-300 mb-1">ℹ️ How it works</p>
                <p>When a seller or user tries to upload an image, the system checks its file size before uploading. If it exceeds the limit, the upload is rejected with a clear error message.</p>
              </div>
            </>)}

            {activeTab === "categories" && (
              <>
                <div className="space-y-6">
                  <div className="rounded-2xl border border-gray-800 bg-gray-950/50 p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div>
                        <Label className="text-gray-300 mb-1 block">Create or edit a category</Label>
                        <p className="text-sm text-gray-500">Leave parent empty to create a main category. Choose a parent to create a sub category.</p>
                      </div>
                      {editingCategoryId && (
                        <Button type="button" variant="outline" className="border-gray-700 text-gray-300" onClick={resetCategoryForm}>Cancel</Button>
                      )}
                    </div>
                    <form onSubmit={handleCategorySubmit} className="space-y-4">
                      <div className="grid gap-4 md:grid-cols-2">
                        <div>
                          <Label className="text-gray-300">Category Name</Label>
                          <Input value={categoryForm.name} onChange={(e) => setCategoryForm({ ...categoryForm, name: e.target.value })} className="mt-1 bg-gray-800 border-gray-700 text-white" placeholder="e.g. Electronics" />
                        </div>
                        <div>
                          <Label className="text-gray-300">Parent Category</Label>
                          <select value={categoryForm.parent_id} onChange={(e) => setCategoryForm({ ...categoryForm, parent_id: e.target.value })} className="mt-1 w-full border border-gray-700 rounded-md px-3 py-2 text-sm bg-gray-800 text-white focus:outline-none focus:ring-1 focus:ring-primary">
                            <option value="">Main Category</option>
                            {categoryList.filter((entry) => !entry.parent_id).map((entry) => <option key={entry.id} value={entry.id}>{entry.name}</option>)}
                          </select>
                        </div>
                        <div>
                          <Label className="text-gray-300">Status</Label>
                          <select value={categoryForm.status} onChange={(e) => setCategoryForm({ ...categoryForm, status: e.target.value })} className="mt-1 w-full border border-gray-700 rounded-md px-3 py-2 text-sm bg-gray-800 text-white focus:outline-none focus:ring-1 focus:ring-primary">
                            <option value="active">Active</option>
                            <option value="inactive">Inactive</option>
                          </select>
                        </div>
                        <div>
                          <Label className="text-gray-300">Image</Label>
                          <div className="mt-1 flex gap-2">
                            <Input value={categoryForm.image} onChange={(e) => setCategoryForm({ ...categoryForm, image: e.target.value })} className="flex-1 bg-gray-800 border-gray-700 text-white" placeholder="Upload image or paste URL" />
                            <label className="flex items-center gap-2 rounded-md border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-gray-300 cursor-pointer">
                              {categoryUploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                              Upload
                              <input type="file" accept="image/*" className="hidden" onChange={handleCategoryImageUpload} />
                            </label>
                          </div>
                        </div>
                      </div>
                      {categoryForm.image && <img src={categoryForm.image} alt="Category preview" className="h-20 w-20 rounded-xl object-cover border border-gray-700" />}
                      <Button type="submit" className="bg-primary hover:bg-primary/90" disabled={categorySaving}>
                        {categorySaving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                        {editingCategoryId ? "Save Changes" : "Create Category"}
                      </Button>
                    </form>
                  </div>

                  <div>
                    <Label className="text-gray-300 mb-3 block">Category Hierarchy</Label>
                    <div className="space-y-2">
                      {treeCategories.length === 0 && <div className="text-sm text-gray-500">No categories yet.</div>}
                      {treeCategories.map((cat) => (
                        <div key={cat.id || cat.name} className="rounded-xl border border-gray-800 bg-gray-950/30 p-3">
                          <div className="flex items-center justify-between gap-3">
                            <div className="flex items-center gap-3">
                              {cat.image ? <img src={cat.image} alt={cat.name} className="h-10 w-10 rounded-lg object-cover" /> : <div className="h-10 w-10 rounded-lg bg-gray-800" />}
                              <div>
                                <p className="text-white font-medium">{cat.name}</p>
                                <p className="text-xs text-gray-500">{cat.parent_id ? "Sub category" : "Main category"}</p>
                              </div>
                            </div>
                            <div className="flex gap-2">
                              <Button type="button" size="sm" variant="outline" className="border-gray-700 text-gray-300" onClick={() => handleEditCategory(cat)}>Edit</Button>
                              <Button type="button" size="sm" variant="destructive" onClick={() => handleDeleteCategory(cat)}>Delete</Button>
                            </div>
                          </div>
                          {cat.children?.length > 0 && (
                            <div className="mt-3 space-y-2 border-l border-gray-800 pl-4 ml-2">
                              {cat.children.map((child) => (
                                <div key={child.id || child.name} className="flex items-center justify-between gap-3 rounded-lg bg-gray-900/60 px-3 py-2">
                                  <div>
                                    <p className="text-sm text-white">{child.name}</p>
                                    <p className="text-xs text-gray-500">Sub category of {cat.name}</p>
                                  </div>
                                  <div className="flex gap-2">
                                    <Button type="button" size="sm" variant="outline" className="border-gray-700 text-gray-300" onClick={() => handleEditCategory(child)}>Edit</Button>
                                    <Button type="button" size="sm" variant="destructive" onClick={() => handleDeleteCategory(child)}>Delete</Button>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </>
            )}

            {activeTab === "deliveryzones" && (
              <>
                <div className="space-y-6">

                  {/* Division */}

                  <div className="space-y-2">
                    <Label className="text-gray-300">
                      Division
                    </Label>

                    <select
                      value={selectedDivision}
                      onChange={(e) => {
                        setSelectedDivision(e.target.value);
                        setSelectedDistrict("");
                        setSelectedArea("");
                      }}
                      className="w-full h-10 rounded-md border border-gray-700 bg-gray-800 px-3 text-white"
                    >
                      <option value="">
                        Select Division
                      </option>

                      {deliveryLocations?.divisions?.map((division) => (
                        <option
                          key={division.id}
                          value={division.id}
                        >
                          {division.name}
                        </option>
                      ))}
                    </select>

                    <div className="flex gap-2">
                      <Input
                        value={newDivision}
                        onChange={(e) =>
                          setNewDivision(e.target.value)
                        }
                        placeholder="New Division"
                        className="bg-gray-800 border-gray-700 text-white"
                      />

                      <Button
                        type="button"
                        onClick={addDivision}
                      >
                        Add Division
                      </Button>
                    </div>

                    {selectedDivision && (() => {
                      const division = deliveryLocations?.divisions?.find(d => d.id === selectedDivision);

                      if (!division) return null;

                      return (
                        <div className="flex gap-2 rounded-lg border border-gray-700 bg-gray-800/50 p-3">
                          <Input
                            value={division.name}
                            onChange={(e) => updateDivisionName(selectedDivision, e.target.value)}
                            className="bg-gray-900 border-gray-700 text-white"
                          />
                          <Button
                            type="button"
                            variant="destructive"
                            size="icon"
                            onClick={() => deleteDivision(selectedDivision)}
                            title="Delete division"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      );
                    })()}
                  </div>

                  {/* District */}

                  <div className="space-y-2">
                    <Label className="text-gray-300">
                      District
                    </Label>

                    <select
                      value={selectedDistrict}
                      onChange={(e) => {
                        setSelectedDistrict(e.target.value);
                        setSelectedArea("");
                      }}
                      disabled={!selectedDivision}
                      className="w-full h-10 rounded-md border border-gray-700 bg-gray-800 px-3 text-white disabled:opacity-50"
                    >
                      <option value="">
                        Select District
                      </option>

                      {deliveryLocations?.divisions
                        ?.find(
                          d => d.id === selectedDivision
                        )
                        ?.districts?.map((district) => (
                          <option
                            key={district.id}
                            value={district.id}
                          >
                            {district.name}
                          </option>
                        ))}
                    </select>

                    <div className="flex gap-2">
                      <Input
                        value={newDistrict}
                        onChange={(e) =>
                          setNewDistrict(e.target.value)
                        }
                        placeholder="New District"
                        disabled={!selectedDivision}
                        className="bg-gray-800 border-gray-700 text-white"
                      />

                      <Button
                        type="button"
                        disabled={!selectedDivision}
                        onClick={addDistrict}
                      >
                        Add District
                      </Button>
                    </div>

                    {selectedDivision && selectedDistrict && (() => {
                      const district = deliveryLocations?.divisions
                        ?.find(d => d.id === selectedDivision)
                        ?.districts?.find(d => d.id === selectedDistrict);

                      if (!district) return null;

                      return (
                        <div className="flex gap-2 rounded-lg border border-gray-700 bg-gray-800/50 p-3">
                          <Input
                            value={district.name}
                            onChange={(e) => updateDistrictName(selectedDivision, selectedDistrict, e.target.value)}
                            className="bg-gray-900 border-gray-700 text-white"
                          />
                          <Button
                            type="button"
                            variant="destructive"
                            size="icon"
                            onClick={() => deleteDistrict(selectedDivision, selectedDistrict)}
                            title="Delete district"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      );
                    })()}
                  </div>

                  {/* Area */}

                  <div className="space-y-2">
                    <Label className="text-gray-300">
                      Area
                    </Label>

                    <select
                      value={selectedArea}
                      onChange={(e) =>
                        setSelectedArea(e.target.value)
                      }
                      disabled={!selectedDistrict}
                      className="w-full h-10 rounded-md border border-gray-700 bg-gray-800 px-3 text-white disabled:opacity-50"
                    >
                      <option value="">
                        Select Area
                      </option>

                      {deliveryLocations?.divisions
                        ?.find(
                          d => d.id === selectedDivision
                        )
                        ?.districts?.find(
                          d => d.id === selectedDistrict
                        )
                        ?.areas?.map((area) => (
                          <option
                            key={area.id}
                            value={area.id}
                          >
                            {area.name}
                          </option>
                        ))}
                    </select>

                    <div className="flex gap-2">
                      <Input
                        value={newArea}
                        onChange={(e) =>
                          setNewArea(e.target.value)
                        }
                        placeholder="New Area"
                        disabled={!selectedDistrict}
                        className="bg-gray-800 border-gray-700 text-white"
                      />

                      <Button
                        type="button"
                        disabled={!selectedDistrict}
                        onClick={addArea}
                      >
                        Add Area
                      </Button>
                    </div>

                    {selectedDivision && selectedDistrict && selectedArea && (() => {
                      const area = deliveryLocations?.divisions
                        ?.find(d => d.id === selectedDivision)
                        ?.districts?.find(d => d.id === selectedDistrict)
                        ?.areas?.find(a => a.id === selectedArea);

                      if (!area) return null;

                      return (
                        <div className="flex gap-2 rounded-lg border border-gray-700 bg-gray-800/50 p-3">
                          <Input
                            value={area.name}
                            onChange={(e) => updateAreaField(selectedDivision, selectedDistrict, selectedArea, "name", e.target.value)}
                            className="bg-gray-900 border-gray-700 text-white"
                          />
                          <Button
                            type="button"
                            variant="destructive"
                            size="icon"
                            onClick={() => deleteArea(selectedDivision, selectedDistrict, selectedArea)}
                            title="Delete area"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      );
                    })()}
                  </div>

                  {/* Selected District Fee */}

                  {selectedDistrict && (() => {
                    const district =
                      deliveryLocations?.divisions
                        ?.find(d => d.id === selectedDivision)
                        ?.districts?.find(
                          d => d.id === selectedDistrict
                        );

                    return (
                      <div className="border border-gray-700 rounded-xl p-4 space-y-3">
                        <h4 className="text-white font-medium">
                          District Delivery Fee
                        </h4>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          <Input
                            type="number"
                            value={district?.default_fee || 0}
                            onChange={(e) =>
                              updateDistrictFee(
                                selectedDivision,
                                selectedDistrict,
                                "default_fee",
                                e.target.value
                              )
                            }
                            placeholder="District Default Fee"
                            className="bg-gray-800 border-gray-700 text-white"
                          />

                          <Input
                            type="number"
                            value={district?.fast_fee || 0}
                            onChange={(e) =>
                              updateDistrictFee(
                                selectedDivision,
                                selectedDistrict,
                                "fast_fee",
                                e.target.value
                              )
                            }
                            placeholder="District Fast Fee"
                            className="bg-gray-800 border-gray-700 text-white"
                          />
                        </div>
                      </div>
                    );
                  })()}

                  {/* Selected Area Fee */}

                  {selectedArea && (() => {
                    const area =
                      deliveryLocations?.divisions
                        ?.find(d => d.id === selectedDivision)
                        ?.districts?.find(
                          d => d.id === selectedDistrict
                        )
                        ?.areas?.find(
                          a => a.id === selectedArea
                        );

                    return (
                      <div className="border border-gray-700 rounded-xl p-4 space-y-3">
                        <h4 className="text-white font-medium">
                          Area Delivery Fee
                        </h4>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">

                          <Input
                            type="number"
                            value={area?.default_fee || 0}
                            onChange={(e) =>
                              updateAreaField(
                                selectedDivision,
                                selectedDistrict,
                                selectedArea,
                                "default_fee",
                                e.target.value
                              )
                            }
                            placeholder="Area Default Fee"
                            className="bg-gray-800 border-gray-700 text-white"
                          />

                          <Input
                            type="number"
                            value={area?.fast_fee || 0}
                            onChange={(e) =>
                              updateAreaField(
                                selectedDivision,
                                selectedDistrict,
                                selectedArea,
                                "fast_fee",
                                e.target.value
                              )
                            }
                            placeholder="Area Fast Fee"
                            className="bg-gray-800 border-gray-700 text-white"
                          />

                        </div>
                      </div>
                    );
                  })()}

                  {/* Unknown Area Fee */}

                  <div className="border border-amber-700/40 bg-amber-900/10 rounded-xl p-4">
                    <h4 className="text-amber-300 font-medium mb-3">
                      Unknown Area Fee
                    </h4>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">

                      <Input
                        type="number"
                        value={
                          deliveryLocations?.unknown_area_fee
                            ?.default_fee || ""
                        }
                        onChange={(e) =>
                          updateUnknownFee(
                            "default_fee",
                            e.target.value
                          )
                        }
                        placeholder="Default Fee"
                        className="bg-gray-800 border-gray-700 text-white"
                      />

                      <Input
                        type="number"
                        value={
                          deliveryLocations?.unknown_area_fee
                            ?.fast_fee || ""
                        }
                        onChange={(e) =>
                          updateUnknownFee(
                            "fast_fee",
                            e.target.value
                          )
                        } 
                        placeholder="Fast Fee"
                        className="bg-gray-800 border-gray-700 text-white"
                      />

                    </div>

                    <p className="text-xs text-gray-500 mt-2">
                      Used when district or area is not found.
                    </p>
                  </div>

                </div>
              </>
            )}

            <Button
              onClick={() => {
                if (activeTab === "deliveryzones") {
                  const updatedSettings = {
                    ...settings,
                    delivery_locations_json: JSON.stringify(deliveryLocations),
                  };

                  setSettings(updatedSettings);

                  handleSaveValues(updatedSettings, TAB_KEYS[activeTab]);
                } else {
                  handleSave(TAB_KEYS[activeTab]);
                }
              }}
              disabled={saving}
              className="w-full bg-primary hover:bg-primary/90 mt-2"
            >
              {saving ? (
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
              ) : (
                <Save className="w-4 h-4 mr-2" />
              )}

              Save {TABS.find(t => t.id === activeTab)?.label} Settings
            </Button>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
