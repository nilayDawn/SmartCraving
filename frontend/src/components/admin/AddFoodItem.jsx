import React, { useState, useEffect } from "react";
import { useNavigate, Link, useSearchParams } from "react-router-dom";
import { toast } from "react-toastify";
import api from "../../utils/api";

const AddFoodItem = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const initialStoreId = searchParams.get("storeId") || "";

  const [restaurants, setRestaurants] = useState([]);
  const [loading, setLoading] = useState(false);

  const [formData, setFormData] = useState({
    restaurantId: initialStoreId,
    name: "",
    price: "",
    description: "",
    category: "Main Course",
    stock: "50",
  });

  // Image handling: Direct File Upload vs Google Drive Photo Link
  const [imageMode, setImageMode] = useState("file"); // 'file' or 'url'
  const [photoFile, setPhotoFile] = useState(null);
  const [photoPreview, setPhotoPreview] = useState("");
  const [imageUrl, setImageUrl] = useState("");

  const handleGenerateAIDescription = async () => {
    if (!formData.name) {
      toast.error("Please enter Item Name first to generate an AI description.");
      return;
    }

    setAiGenerating(true);
    try {
      const { data } = await api.post("/v1/ai/generate-food", {
        name: formData.name,
        category: formData.category || "Main Course",
        price: Number(formData.price) || 10,
        spiceLevel: "Medium",
      });

      if (data?.data?.description) {
        setFormData((prev) => ({
          ...prev,
          description: data.data.description,
        }));
        toast.success("✨ AI Description generated successfully!");
      } else {
        toast.error("Failed to extract AI description.");
      }
    } catch (err) {
      toast.error("AI service error. Try writing manual description.");
    } finally {
      setAiGenerating(false);
    }
  };

  // Fetch list of restaurants for selector
  useEffect(() => {
    const fetchRestaurants = async () => {
      try {
        const { data } = await api.get("/v1/eats/stores");
        setRestaurants(data.data || []);
        if (!initialStoreId && data.restaurants && data.restaurants.length > 0) {
          setFormData((prev) => ({ ...prev, restaurantId: data.restaurants[0]._id }));
        }
      } catch (err) {
        toast.error("Failed to load restaurants list");
      }
    };
    fetchRestaurants();
  }, [initialStoreId]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value,
    });
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => {
        if (reader.readyState === 2) {
          setPhotoPreview(reader.result);
          setPhotoFile(reader.result);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.restaurantId || !formData.name || !formData.price || !formData.description) {
      toast.error("Please fill in all required item details.");
      return;
    }

    const formattedLink = formatGDriveUrl(imageUrl);
    const finalImage = imageMode === "file" ? photoFile : formattedLink;

    if (!finalImage) {
      toast.error("Please upload a food photo file or provide a Google Drive photo link.");
      return;
    }

    setLoading(true);

    try {
      const payload = {
        restaurant: formData.restaurantId,
        name: formData.name,
        price: Number(formData.price),
        description: formData.description,
        category: formData.category,
        stock: Number(formData.stock),
        image: finalImage,
        imageUrl: finalImage,
      };

      await api.post("/v1/eats/item", payload);
      toast.success(`Dish '${formData.name}' added successfully!`);
      navigate(`/eats/stores/${formData.restaurantId}/menus`);
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to create food item.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto max-w-4xl py-6">
      {/* Breadcrumb */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="font-display text-3xl font-extrabold text-slate-900">
            🍲 Add New Dish / Food Item
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Admin Panel: Create gourmet menu entry with direct photo upload beside Google Drive link.
          </p>
        </div>
        <Link
          to="/admin/dashboard"
          className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-bold text-slate-700 shadow-sm transition hover:bg-slate-50"
        >
          ← Admin Dashboard
        </Link>
      </div>

      <form onSubmit={handleSubmit} className="glass-card rounded-3xl p-8 shadow-xl space-y-6">
        {/* Restaurant Selection */}
        <div>
          <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-slate-700">
            Target Restaurant <span className="text-rose-500">*</span>
          </label>
          <select
            name="restaurantId"
            value={formData.restaurantId}
            onChange={handleInputChange}
            required
            className="form-control font-bold text-slate-800"
          >
            <option value="">Select Restaurant Store</option>
            {restaurants.map((rest) => (
              <option key={rest._id} value={rest._id}>
                {rest.name} ({rest.address})
              </option>
            ))}
          </select>
        </div>

        {/* Basic Details */}
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          <div>
            <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-slate-700">
              Item / Dish Name <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              name="name"
              value={formData.name}
              onChange={handleInputChange}
              placeholder="e.g. Truffle Mushroom Risotto"
              required
              className="form-control"
            />
          </div>

          <div>
            <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-slate-700">
              Price (₹) <span className="text-rose-500">*</span>
            </label>
            <input
              type="number"
              name="price"
              value={formData.price}
              onChange={handleInputChange}
              placeholder="349"
              required
              className="form-control"
            />
          </div>
        </div>

        {/* Category & Stock */}
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          <div>
            <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-slate-700">
              Menu Category
            </label>
            <input
              type="text"
              name="category"
              value={formData.category}
              onChange={handleInputChange}
              placeholder="e.g. Starters, Main Course, Desserts"
              className="form-control"
            />
          </div>

          <div>
            <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-slate-700">
              Stock Quantity
            </label>
            <input
              type="number"
              name="stock"
              value={formData.stock}
              onChange={handleInputChange}
              placeholder="50"
              className="form-control"
            />
          </div>
        </div>

        {/* Description & AI Generator */}
        <div>
          <div className="mb-2 flex items-center justify-between">
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
              Description <span className="text-rose-500">*</span>
            </label>

            <button
              type="button"
              onClick={handleGenerateAIDescription}
              disabled={aiGenerating}
              className="inline-flex items-center gap-1.5 rounded-xl border border-purple-200 bg-purple-50 px-3 py-1.5 text-xs font-extrabold text-purple-700 shadow-sm transition hover:bg-purple-100 disabled:opacity-50"
            >
              {aiGenerating ? (
                <>
                  <span className="h-3 w-3 animate-spin rounded-full border-2 border-purple-700 border-t-transparent" />
                  Generating AI...
                </>
              ) : (
                <>✨ Generate AI Description</>
              )}
            </button>
          </div>

          <textarea
            name="description"
            rows="3"
            value={formData.description}
            onChange={handleInputChange}
            placeholder="A rich blend of wild mushrooms, Arborio rice, white wine, and fresh truffle oil..."
            required
            className="form-control"
          />
        </div>

        {/* Photo Upload Section: Direct Upload beside Google Drive Link */}
        <div className="rounded-3xl border border-emerald-100 bg-emerald-50/40 p-6">
          <div className="mb-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <div>
              <h3 className="font-display text-lg font-bold text-slate-900 flex items-center gap-2">
                <span>📷</span> Food Item Photo Upload
              </h3>
              <p className="text-xs text-slate-500">
                Upload photo file directly or paste Google Drive photo link.
              </p>
            </div>

            {/* Mode Selector Tabs */}
            <div className="inline-flex rounded-xl border border-slate-200 bg-white p-1 shadow-sm">
              <button
                type="button"
                onClick={() => setImageMode("file")}
                className={`rounded-lg px-3.5 py-1.5 text-xs font-bold transition ${
                  imageMode === "file"
                    ? "bg-emerald-600 text-white shadow-sm"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                📁 Direct Upload
              </button>
              <button
                type="button"
                onClick={() => setImageMode("url")}
                className={`rounded-lg px-3.5 py-1.5 text-xs font-bold transition ${
                  imageMode === "url"
                    ? "bg-emerald-600 text-white shadow-sm"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                🔗 Google Drive Link
              </button>
            </div>
          </div>

          {/* Side-by-side photo options */}
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            {/* Option A: Direct File Upload */}
            <div
              className={`rounded-2xl border-2 p-5 transition ${
                imageMode === "file"
                  ? "border-emerald-500 bg-white shadow-md ring-2 ring-emerald-500/10"
                  : "border-dashed border-slate-200 bg-slate-50/60 opacity-60"
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-extrabold uppercase tracking-wider text-emerald-700">
                  Option A: Direct Photo Upload
                </span>
                <span className="text-[10px] font-bold text-slate-400">File Upload</span>
              </div>
              <input
                type="file"
                accept="image/*"
                onChange={handleFileChange}
                onClick={() => setImageMode("file")}
                className="w-full text-xs text-slate-500 file:mr-4 file:rounded-xl file:border-0 file:bg-emerald-100 file:px-4 file:py-2 file:text-xs file:font-bold file:text-emerald-700 hover:file:bg-emerald-200"
              />
              <p className="mt-2 text-[11px] text-slate-400">
                PNG, JPG, WEBP formats supported. Instant preview below.
              </p>
            </div>

            {/* Option B: Google Drive Photo Link */}
            <div
              className={`rounded-2xl border-2 p-5 transition ${
                imageMode === "url"
                  ? "border-emerald-500 bg-white shadow-md ring-2 ring-emerald-500/10"
                  : "border-dashed border-slate-200 bg-slate-50/60 opacity-60"
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-extrabold uppercase tracking-wider text-teal-700">
                  Option B: Google Drive Link
                </span>
                <span className="text-[10px] font-bold text-slate-400">GDrive Link</span>
              </div>
              <input
                type="url"
                value={imageUrl}
                onChange={(e) => {
                  setImageUrl(e.target.value);
                  setImageMode("url");
                }}
                onFocus={() => setImageMode("url")}
                placeholder="Paste Google Drive photo link (e.g. https://drive.google.com/file/d/1A2B3C...)"
                className="form-control text-xs"
              />
              <p className="mt-2 text-[11px] text-slate-400">
                Paste Google Drive shareable photo link. Auto-converts to direct image stream.
              </p>
            </div>
          </div>

          {/* Live Image Preview */}
          <div className="mt-6 border-t border-slate-200/60 pt-4">
            <span className="mb-2 block text-xs font-bold uppercase tracking-wider text-slate-600">
              Dish Photo Live Preview:
            </span>
            <div className="relative flex h-48 w-full items-center justify-center overflow-hidden rounded-2xl border border-slate-200 bg-slate-100 shadow-inner">
              {imageMode === "file" && photoPreview ? (
                <img
                  src={photoPreview}
                  alt="Direct Upload Preview"
                  className="h-full w-full object-cover"
                />
              ) : imageMode === "url" && imageUrl ? (
                <img
                  src={formatGDriveUrl(imageUrl)}
                  alt="URL Link Preview"
                  onError={(e) => {
                    e.target.onerror = null;
                    e.target.src = "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=800";
                  }}
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="text-center p-4">
                  <span className="text-3xl">🍲</span>
                  <p className="mt-1 text-xs font-medium text-slate-400">
                    No dish photo selected yet. Upload a photo file or paste a Google Drive link above.
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Submit Button */}
          <div className="flex justify-end gap-3 pt-4">
            <Link
              to="/admin/dashboard"
              className="rounded-xl border border-slate-200 bg-white px-6 py-3 font-bold text-slate-700 transition hover:bg-slate-50"
            >
              Cancel
            </Link>
            <button
              type="submit"
              disabled={loading}
              className="btn btn-primary px-8 py-3 font-extrabold"
            >
              {loading ? "Adding Item..." : "✨ Add Food Item to Menu"}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
};

export default AddFoodItem;
