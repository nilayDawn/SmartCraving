import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { toast } from "react-toastify";
import api from "../../utils/api";

const formatGDriveUrl = (url) => {
  if (!url) return "";
  const match = url.match(/\/file\/d\/([a-zA-Z0-9_-]+)/) || url.match(/id=([a-zA-Z0-9_-]+)/);
  if (match && match[1]) {
    return `https://drive.google.com/uc?export=view&id=${match[1]}`;
  }
  return url;
};

const AddRestaurant = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);

  const [formData, setFormData] = useState({
    name: "",
    address: "",
    isVeg: false,
    latitude: 12.9716,
    longitude: 77.5946,
  });

  // Image handling: Direct File Upload vs Google Drive Photo Link
  const [imageMode, setImageMode] = useState("file"); // 'file' or 'url'
  const [photoFile, setPhotoFile] = useState(null);
  const [photoPreview, setPhotoPreview] = useState("");
  const [imageUrl, setImageUrl] = useState("");

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData({
      ...formData,
      [name]: type === "checkbox" ? checked : value,
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

    if (!formData.name || !formData.address) {
      toast.error("Please enter Restaurant Name and Address");
      return;
    }

    const formattedLink = formatGDriveUrl(imageUrl);
    const finalImage = imageMode === "file" ? photoFile : formattedLink;

    if (!finalImage) {
      toast.error("Please upload a photo directly or provide a Google Drive photo link");
      return;
    }

    setLoading(true);

    try {
      const payload = {
        name: formData.name,
        address: formData.address,
        isVeg: formData.isVeg,
        location: {
          type: "Point",
          coordinates: [Number(formData.longitude), Number(formData.latitude)],
        },
        image: finalImage,
        imageUrl: finalImage,
      };

      const { data } = await api.post("/v1/eats/stores", payload);

      toast.success(`Restaurant '${formData.name}' created successfully!`);
      navigate("/admin/dashboard");
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to create restaurant");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto max-w-4xl py-6">
      {/* Navigation Breadcrumb */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="font-display text-3xl font-extrabold text-slate-900">
            ➕ Create New Restaurant
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Admin panel: Add store with direct photo upload beside Google Drive link.
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
          {/* Restaurant Details */}
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            <div>
              <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-slate-700">
                Restaurant Name <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleInputChange}
                placeholder="e.g. Gourmet Pizza Bistro"
                required
                className="form-control"
              />
            </div>

            <div>
              <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-slate-700">
                Address / Location <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                name="address"
                value={formData.address}
                onChange={handleInputChange}
                placeholder="e.g. 123 Culinary St, Downtown"
                required
                className="form-control"
              />
            </div>
          </div>

          <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50/80 p-4">
            <input
              type="checkbox"
              id="isVeg"
              name="isVeg"
              checked={formData.isVeg}
              onChange={handleInputChange}
              className="h-5 w-5 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
            />
            <label htmlFor="isVeg" className="cursor-pointer font-bold text-slate-800 text-sm">
              🌱 Pure Vegetarian Restaurant
            </label>
          </div>

          {/* Photo Upload Section: Direct Photo Upload beside Google Drive Link */}
          <div className="rounded-3xl border border-emerald-100 bg-emerald-50/40 p-6">
            <div className="mb-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
              <div>
                <h3 className="font-display text-lg font-bold text-slate-900 flex items-center gap-2">
                  <span>📸</span> Restaurant Photo Upload
                </h3>
                <p className="text-xs text-slate-500">
                  Upload photo directly from device or provide a Google Drive photo link beside it.
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
                    Option A: Upload Photo File
                  </span>
                  <span className="text-[10px] font-bold text-slate-400">Direct Upload</span>
                </div>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleFileChange}
                  onClick={() => setImageMode("file")}
                  className="w-full text-xs text-slate-500 file:mr-4 file:rounded-xl file:border-0 file:bg-emerald-100 file:px-4 file:py-2 file:text-xs file:font-bold file:text-emerald-700 hover:file:bg-emerald-200"
                />
                <p className="mt-2 text-[11px] text-slate-400">
                  PNG, JPG, WEBP formats supported. Instant live preview.
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
                  Paste Google Drive shareable photo link. Auto-converts for display.
                </p>
              </div>
            </div>

            {/* Live Image Preview */}
            <div className="mt-6 border-t border-slate-200/60 pt-4">
              <span className="mb-2 block text-xs font-bold uppercase tracking-wider text-slate-600">
                Photo Live Preview:
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
                      e.target.src = "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=800";
                    }}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="text-center p-4">
                    <span className="text-3xl">🖼️</span>
                    <p className="mt-1 text-xs font-medium text-slate-400">
                      No photo selected yet. Choose a photo file or enter an image link above.
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
              {loading ? "Creating Store..." : "Save & Create Restaurant"}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
};

export default AddRestaurant;
