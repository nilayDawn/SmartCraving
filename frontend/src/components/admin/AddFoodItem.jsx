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

  // Image handling: Direct File Upload vs Image URL Link
  const [imageMode, setImageMode] = useState("file"); // 'file' or 'url'
  const [photoFile, setPhotoFile] = useState(null);
  const [photoPreview, setPhotoPreview] = useState("");
  const [imageUrl, setImageUrl] = useState("");

  // Fetch list of restaurants for selector
  useEffect(() => {
    const fetchRestaurants = async () => {
      try {
        const { data } = await api.get("/v1/eats/stores");
        setRestaurants(data.restaurants || []);
        if (!initialStoreId && data.restaurants?.length > 0) {
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

    const finalImage = imageMode === "file" ? photoFile : imageUrl;

    if (!finalImage) {
      toast.error("Please upload an item photo directly or provide an image link.");
      return;
    }

    setLoading(true);

    try {
      const payload = {
        name: formData.name,
        price: Number(formData.price),
        description: formData.description,
        stock: Number(formData.stock),
        category: formData.category,
        restaurant: formData.restaurantId,
        image: finalImage,
        imageUrl: finalImage,
      };

      const { data } = await api.post("/v1/eats/item", payload);

      toast.success(`Food Item '${formData.name}' added successfully!`);
      navigate("/admin/dashboard");
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to add food item");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto max-w-4xl py-6">
      {/* Navigation Header */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="font-display text-3xl font-extrabold text-slate-900">
            🍔 Add New Food Item
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Admin panel: Add dish to menu with direct photo upload beside image URL link.
          </p>
        </div>
        <Link
          to="/admin/dashboard"
          className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-bold text-slate-700 shadow-sm transition hover:bg-slate-50"
        >
          ← Back to Admin Dashboard
        </Link>
      </div>

      <form onSubmit={handleSubmit} className="glass-card rounded-3xl p-8 shadow-xl">
        <div className="space-y-6">
          {/* Restaurant Selector */}
          <div>
            <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-slate-700">
              Select Target Restaurant <span className="text-rose-500">*</span>
            </label>
            <select
              name="restaurantId"
              value={formData.restaurantId}
              onChange={handleInputChange}
              required
              className="form-control font-medium"
            >
              <option value="">-- Choose Restaurant --</option>
              {restaurants.map((res) => (
                <option key={res._id} value={res._id}>
                  {res.name} ({res.address})
                </option>
              ))}
            </select>
          </div>

          {/* Item Details */}
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            <div>
              <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-slate-700">
                Item Name <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleInputChange}
                placeholder="e.g. Paneer Butter Masala"
                required
                className="form-control"
              />
            </div>

            <div>
              <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-slate-700">
                Price ($) <span className="text-rose-500">*</span>
              </label>
              <input
                type="number"
                step="0.01"
                name="price"
                value={formData.price}
                onChange={handleInputChange}
                placeholder="e.g. 14.99"
                required
                className="form-control"
              />
            </div>
          </div>

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

          <div>
            <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-slate-700">
              Description <span className="text-rose-500">*</span>
            </label>
            <textarea
              name="description"
              rows="3"
              value={formData.description}
              onChange={handleInputChange}
              placeholder="Delicious preparation with fresh ingredients and authentic spices..."
              required
              className="form-control"
            ></textarea>
          </div>

          {/* Photo Upload Section: Direct Photo Upload beside Link */}
          <div className="rounded-3xl border border-emerald-100 bg-emerald-50/40 p-6">
            <div className="mb-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
              <div>
                <h3 className="font-display text-lg font-bold text-slate-900 flex items-center gap-2">
                  <span>📷</span> Item Photo Upload
                </h3>
                <p className="text-xs text-slate-500">
                  Upload dish photo directly from computer or paste an image link beside it.
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
                  📁 Direct Photo Upload
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
                  🔗 Image URL Link
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

              {/* Option B: Image URL Link */}
              <div
                className={`rounded-2xl border-2 p-5 transition ${
                  imageMode === "url"
                    ? "border-emerald-500 bg-white shadow-md ring-2 ring-emerald-500/10"
                    : "border-dashed border-slate-200 bg-slate-50/60 opacity-60"
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-extrabold uppercase tracking-wider text-teal-700">
                    Option B: Image URL Link
                  </span>
                  <span className="text-[10px] font-bold text-slate-400">Image Link</span>
                </div>
                <input
                  type="url"
                  value={imageUrl}
                  onChange={(e) => {
                    setImageUrl(e.target.value);
                    setImageMode("url");
                  }}
                  onFocus={() => setImageMode("url")}
                  placeholder="https://images.unsplash.com/photo-..."
                  className="form-control text-xs"
                />
                <p className="mt-2 text-[11px] text-slate-400">
                  Paste direct link to item image.
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
                    src={imageUrl}
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
                      No dish photo selected yet. Upload a photo file or paste an image link above.
                    </p>
                  </div>
                )}
              </div>
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
