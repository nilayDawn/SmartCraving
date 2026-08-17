import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import api from "../../utils/api";

const AdminDashboard = () => {
  const navigate = useNavigate();
  const [restaurants, setRestaurants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState(null);

  const fetchRestaurants = async () => {
    try {
      setLoading(true);
      const { data } = await api.get("/v1/eats/stores");
      setRestaurants(data.restaurants || []);
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to load admin restaurants");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRestaurants();
  }, []);

  const handleDeleteRestaurant = async (id, name) => {
    if (!window.confirm(`Are you sure you want to delete restaurant "${name}"?`)) {
      return;
    }

    try {
      setDeletingId(id);
      await api.delete(`/v1/eats/stores/${id}`);
      toast.success(`Restaurant "${name}" deleted successfully.`);
      setRestaurants((prev) => prev.filter((item) => item._id !== id));
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to delete restaurant");
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="mx-auto max-w-7xl py-6 space-y-8">
      {/* Header Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-slate-900 via-emerald-950 to-slate-900 p-8 text-white shadow-2xl">
        <div className="relative z-10 flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-emerald-500/20 px-3 py-1 text-xs font-bold text-emerald-300 backdrop-blur-md">
              <span>👑</span> Admin Control Panel
            </div>
            <h1 className="mt-3 font-display text-3xl font-extrabold tracking-tight sm:text-4xl">
              Restaurant & Menu Management
            </h1>
            <p className="mt-2 max-w-xl text-sm text-slate-300">
              Upload restaurant and menu item photos directly from your device or using image links beside them.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <Link
              to="/admin/restaurants/new"
              className="inline-flex items-center gap-2 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-500 px-5 py-3 font-display text-sm font-bold text-white shadow-lg shadow-emerald-500/25 transition duration-200 hover:-translate-y-0.5 hover:from-emerald-600 hover:to-teal-600 active:scale-[0.98]"
            >
              <span>🏪</span> + Add Restaurant
            </Link>

            <Link
              to="/admin/items/new"
              className="inline-flex items-center gap-2 rounded-2xl border border-white/20 bg-white/10 px-5 py-3 font-display text-sm font-bold text-white backdrop-blur-md transition duration-200 hover:bg-white/20 active:scale-[0.98]"
            >
              <span>🍕</span> + Add Food Item
            </Link>
          </div>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">
        <div className="glass-card flex items-center gap-4 rounded-3xl p-6">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-50 text-2xl text-emerald-600">
            🏬
          </div>
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-slate-500">Total Restaurants</p>
            <h3 className="font-display text-2xl font-black text-slate-900">{restaurants.length}</h3>
          </div>
        </div>

        <div className="glass-card flex items-center gap-4 rounded-3xl p-6">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-teal-50 text-2xl text-teal-600">
            📸
          </div>
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-slate-500">Photo Upload Mode</p>
            <h3 className="font-display text-sm font-extrabold text-teal-700">Direct File & URL Beside Link</h3>
          </div>
        </div>

        <div className="glass-card flex items-center gap-4 rounded-3xl p-6">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-50 text-2xl text-indigo-600">
            ⚡
          </div>
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-slate-500">Role Status</p>
            <h3 className="font-display text-sm font-extrabold text-indigo-700">Verified Administrator</h3>
          </div>
        </div>
      </div>

      {/* Restaurants List Table / Grid */}
      <div className="glass-card rounded-3xl p-6 sm:p-8">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h2 className="font-display text-2xl font-extrabold text-slate-900">
              Manage Restaurants ({restaurants.length})
            </h2>
            <p className="text-xs text-slate-500">
              View, manage, add menu items, or delete stores.
            </p>
          </div>

          <Link
            to="/admin/restaurants/new"
            className="btn btn-outline-primary text-xs font-bold"
          >
            + Add New Store
          </Link>
        </div>

        {loading ? (
          <div className="py-12 text-center text-slate-500">Loading restaurants...</div>
        ) : restaurants.length === 0 ? (
          <div className="py-12 text-center">
            <p className="text-slate-500">No restaurants added yet.</p>
            <Link
              to="/admin/restaurants/new"
              className="mt-3 inline-block btn btn-primary text-xs"
            >
              + Create First Restaurant
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
            {restaurants.map((restaurant) => {
              const imgUrl = restaurant.images?.[0]?.url || "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=800";

              return (
                <div
                  key={restaurant._id}
                  className="flex flex-col justify-between overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition hover:shadow-md"
                >
                  <div>
                    <div className="relative h-44 w-full bg-slate-100">
                      <img
                        src={imgUrl}
                        alt={restaurant.name}
                        className="h-full w-full object-cover"
                        onError={(e) => {
                          e.target.onerror = null;
                          e.target.src = "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=800";
                        }}
                      />
                      {restaurant.isVeg && (
                        <span className="absolute top-3 left-3 rounded-full bg-emerald-600 px-2.5 py-1 text-[10px] font-extrabold text-white shadow-md">
                          🌱 Pure Veg
                        </span>
                      )}
                    </div>

                    <div className="p-5">
                      <h3 className="font-display text-lg font-extrabold text-slate-900">
                        {restaurant.name}
                      </h3>
                      <p className="mt-1 text-xs text-slate-500 line-clamp-2">
                        📍 {restaurant.address}
                      </p>

                      <div className="mt-3 flex items-center gap-3 text-xs text-slate-600">
                        <span>⭐ {restaurant.ratings || 4.5}</span>
                        <span>•</span>
                        <span>💬 {restaurant.numOfReviews || 0} reviews</span>
                      </div>
                    </div>
                  </div>

                  <div className="border-t border-slate-100 bg-slate-50/70 p-4 flex items-center justify-between gap-2">
                    <Link
                      to={`/eats/stores/${restaurant._id}/menus`}
                      className="rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-700 transition hover:bg-slate-100"
                    >
                      📖 View Menu
                    </Link>

                    <Link
                      to={`/admin/items/new?storeId=${restaurant._id}`}
                      className="rounded-xl bg-emerald-50 px-3 py-1.5 text-xs font-bold text-emerald-700 hover:bg-emerald-100 transition"
                    >
                      ➕ Add Item
                    </Link>

                    <button
                      onClick={() => handleDeleteRestaurant(restaurant._id, restaurant.name)}
                      disabled={deletingId === restaurant._id}
                      className="rounded-xl bg-rose-50 px-3 py-1.5 text-xs font-bold text-rose-600 hover:bg-rose-100 transition disabled:opacity-50"
                    >
                      🗑️
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminDashboard;
