import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { toast } from "react-toastify";
import api from "../../utils/api";

const emptyForm = {
  couponName: "",
  subTitle: "",
  minAmount: "",
  maxDiscount: "",
  discount: "",
  details: "",
  expire: "",
};

const AdminCoupons = () => {
  const [coupons, setCoupons] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const loadCoupons = async (signal) => {
    try {
      const { data } = await api.get("/v1/coupon", { signal });
      setCoupons(data.data || []);
    } catch (error) {
      if (error.code !== "ERR_CANCELED") {
        toast.error(error.response?.data?.message || "Failed to load coupons");
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const controller = new AbortController();
    loadCoupons(controller.signal);
    return () => controller.abort();
  }, []);

  const updateField = (event) => {
    setForm((current) => ({ ...current, [event.target.name]: event.target.value }));
  };

  const resetForm = () => {
    setForm(emptyForm);
    setEditingId(null);
  };

  const submitHandler = async (event) => {
    event.preventDefault();
    try {
      setSaving(true);
      const payload = {
        ...form,
        couponName: form.couponName.trim().toUpperCase(),
        minAmount: Number(form.minAmount),
        maxDiscount: Number(form.maxDiscount),
        discount: Number(form.discount),
      };

      if (editingId) {
        await api.patch(`/v1/coupon/${editingId}`, payload);
        toast.success("Coupon updated");
      } else {
        await api.post("/v1/coupon", payload);
        toast.success("Coupon created");
      }

      resetForm();
      await loadCoupons();
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to save coupon");
    } finally {
      setSaving(false);
    }
  };

  const editCoupon = (coupon) => {
    setEditingId(coupon._id);
    setForm({
      couponName: coupon.couponName || "",
      subTitle: coupon.subTitle || "",
      minAmount: coupon.minAmount ?? "",
      maxDiscount: coupon.maxDiscount ?? "",
      discount: coupon.discount ?? "",
      details: coupon.details || "",
      expire: coupon.expire ? new Date(coupon.expire).toISOString().slice(0, 10) : "",
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const deleteCoupon = async (coupon) => {
    if (!window.confirm(`Delete coupon ${coupon.couponName}?`)) return;

    try {
      await api.delete(`/v1/coupon/${coupon._id}`);
      setCoupons((current) => current.filter((item) => item._id !== coupon._id));
      if (editingId === coupon._id) resetForm();
      toast.success("Coupon deleted");
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to delete coupon");
    }
  };

  return (
    <section className="mx-auto max-w-7xl space-y-6 py-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <Link to="/admin/dashboard" className="text-xs font-bold text-emerald-700 hover:underline">← Dashboard</Link>
          <h1 className="mt-2 font-display text-3xl font-extrabold text-slate-900">Manage Coupons</h1>
          <p className="mt-1 text-sm text-slate-500">Create and maintain offers available to customers.</p>
        </div>
      </div>

      <form onSubmit={submitHandler} className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="font-display text-xl font-extrabold text-slate-900">{editingId ? "Edit coupon" : "Create coupon"}</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[
            ["couponName", "Code", "SAVE20", "text"],
            ["subTitle", "Subtitle", "20% off your order", "text"],
            ["minAmount", "Minimum order", "500", "number"],
            ["maxDiscount", "Maximum discount", "200", "number"],
            ["discount", "Discount (%)", "20", "number"],
            ["expire", "Expiry date", "", "date"],
          ].map(([name, label, placeholder, type]) => (
            <label key={name} className="text-xs font-bold text-slate-600">
              {label}
              <input
                required
                name={name}
                type={type}
                value={form[name]}
                placeholder={placeholder}
                min={type === "number" ? 0 : undefined}
                onChange={updateField}
                className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm font-normal text-slate-800 outline-none focus:border-emerald-500"
              />
            </label>
          ))}
          <label className="text-xs font-bold text-slate-600 sm:col-span-2 lg:col-span-2">
            Details
            <textarea
              required
              name="details"
              value={form.details}
              onChange={updateField}
              rows={2}
              placeholder="Offer details and terms"
              className="mt-1 w-full resize-none rounded-xl border border-slate-200 px-3 py-2.5 text-sm font-normal text-slate-800 outline-none focus:border-emerald-500"
            />
          </label>
        </div>
        <div className="mt-4 flex flex-wrap gap-3">
          <button disabled={saving} className="rounded-xl bg-emerald-600 px-5 py-2.5 text-xs font-bold text-white hover:bg-emerald-700 disabled:opacity-60">
            {saving ? "Saving..." : editingId ? "Update coupon" : "Create coupon"}
          </button>
          {editingId && <button type="button" onClick={resetForm} className="rounded-xl border border-slate-200 px-5 py-2.5 text-xs font-bold text-slate-700 hover:bg-slate-50">Cancel edit</button>}
        </div>
      </form>

      <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="font-display text-xl font-extrabold text-slate-900">Coupons ({coupons.length})</h2>
        {loading ? <p className="py-8 text-sm text-slate-500">Loading coupons...</p> : coupons.length === 0 ? <p className="py-8 text-sm text-slate-500">No coupons created yet.</p> : (
          <div className="mt-4 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {coupons.map((coupon) => (
              <article key={coupon._id} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="font-display text-lg font-black text-emerald-700">{coupon.couponName}</h3>
                    <p className="text-xs font-semibold text-slate-600">{coupon.subTitle}</p>
                  </div>
                  <span className="rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-black text-emerald-700">{coupon.discount}% OFF</span>
                </div>
                <p className="mt-3 text-sm text-slate-600">{coupon.details}</p>
                <p className="mt-2 text-xs text-slate-500">Min ₹{coupon.minAmount} · Up to ₹{coupon.maxDiscount} · Expires {new Date(coupon.expire).toLocaleDateString()}</p>
                <div className="mt-4 flex gap-2">
                  <button onClick={() => editCoupon(coupon)} className="rounded-xl bg-white px-3 py-2 text-xs font-bold text-slate-700 ring-1 ring-slate-200 hover:bg-slate-100">Edit</button>
                  <button onClick={() => deleteCoupon(coupon)} className="rounded-xl bg-rose-50 px-3 py-2 text-xs font-bold text-rose-600 hover:bg-rose-100">Delete</button>
                </div>
              </article>
            ))}
          </div>
        )}
      </div>
    </section>
  );
};

export default AdminCoupons;
