import React, { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import {
  sortByRatings,
  sortByReviews,
  toggleVegOnly,
} from "../redux/slices/restaurantSlice";

import {
  createRestaurant,
  getRestaurants,
} from "../redux/actions/restaurantAction";
import Restaurant from "./Restaurant";
import Fooditem from "./Fooditem";
import Loader from "./layout/Loader";
import Message from "./Message";
import { useDispatch, useSelector } from "react-redux";
import CountRestaurant from "./CountRestaurant";
import { toast } from "react-toastify";

const Home = () => {
  const dispatch = useDispatch();
  const { keyword } = useParams();

  const {
    loading: restaurantsLoading,
    error: restaurantsError,
    restaurants,
    foodItems,
    showVegOnly,
    creating,
    createError,
  } = useSelector((state) => state.restaurants);

  const {
    isAuthenticated,
    user,
  } = useSelector((state) => state.user);

  const [activeSort, setActiveSort] = useState(null);

  useEffect(() => {
    if (restaurantsError) {
      toast.error(restaurantsError);
      return;
    }
    dispatch(getRestaurants(keyword));
  }, [dispatch, restaurantsError, keyword]);

  const handleSortByRatings = () => {
    setActiveSort("ratings");
    dispatch(sortByRatings());
  };

  const handleSortByReviews = () => {
    setActiveSort("reviews");
    dispatch(sortByReviews());
  };

  // admin controls
  const [showCreate, setShowCreate] = useState(false);
  const [newRestaurant, setNewRestaurant] = useState({
    name: "",
    address: "",
    isVeg: false,
    location: { type: "Point", coordinates: [] },
    imageUrl: "",
  });
  const [coordsInput, setCoordsInput] = useState("");

  const handleOpenCreate = () => {
    setCoordsInput(newRestaurant.location.coordinates.join(","));
    setShowCreate(true);
  };

  const handleCloseCreate = () => {
    setShowCreate(false);
    setCoordsInput("");
  };

  const handleChange = (e) => {
    const { name, value, checked } = e.target;

    if (name === "isVeg") {
      setNewRestaurant({ ...newRestaurant, isVeg: checked });
    } else if (name === "coordinates") {
      setCoordsInput(value);

      const parts = value
        .split(",")
        .map((v) => v.trim())
        .filter((v) => v !== "");

      const coords = parts.map((v) => parseFloat(v)).filter((n) => !isNaN(n));

      setNewRestaurant({
        ...newRestaurant,
        location: { ...newRestaurant.location, coordinates: coords },
      });
    } else if (name === "imageUrl") {
      setNewRestaurant({ ...newRestaurant, imageUrl: value });
    } else {
      setNewRestaurant({ ...newRestaurant, [name]: value });
    }
  };

  const submitCreate = async (e) => {
    e.preventDefault();

    const payload = {
      name: newRestaurant.name,
      address: newRestaurant.address,
      isVeg: newRestaurant.isVeg,
      location: newRestaurant.location,
      images: [
        {
          public_id: "default",
          url: newRestaurant.imageUrl,
        },
      ],
    };

    const result = await dispatch(createRestaurant(payload));

    if (createRestaurant.fulfilled.match(result)) {
      handleCloseCreate();
      setCoordsInput("");
      toast.success("Restaurant added successfully");
    }
  };

  const handleToggleVegOnly = () => {
    dispatch(toggleVegOnly());
  };

  return (
    <div className="space-y-8 pb-12">
      {/* Clean Catalog Header Banner */}
      <section className="relative overflow-hidden rounded-3xl border border-slate-200/80 bg-white/95 p-6 shadow-xl backdrop-blur-xl sm:p-8">
        <div className="space-y-2 max-w-2xl">
          <div className="inline-flex items-center gap-2 rounded-full bg-emerald-50 px-3.5 py-1 text-xs font-bold text-emerald-800 border border-emerald-200">
            <span>🥗</span> Featured Kitchens
          </div>
          <h1 className="font-display text-2xl font-extrabold text-slate-900 sm:text-3xl">
            Explore Top Restaurants
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 leading-relaxed">
            Order directly from top-rated local kitchens with verified AI review summaries and chef-crafted menus.
          </p>
        </div>
      </section>

      {/* Stats Counter & Controls */}
      <div>
        <CountRestaurant />

        <div className="mb-8 flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2.5">
            <button
              className={`inline-flex items-center gap-2 rounded-2xl px-4 py-2.5 text-xs font-bold transition-all duration-200 ${
                showVegOnly
                  ? "bg-emerald-600 text-white shadow-lg shadow-emerald-600/30 ring-2 ring-emerald-400"
                  : "border border-slate-200 bg-white text-slate-700 hover:border-emerald-300 hover:bg-emerald-50/50"
              }`}
              onClick={handleToggleVegOnly}
            >
              <span className={`h-2.5 w-2.5 rounded-full ${showVegOnly ? "bg-white" : "bg-emerald-500"}`} />
              {showVegOnly ? "Showing Pure Veg Only" : "Filter Pure Veg"}
            </button>

            <button
              className={`inline-flex items-center gap-1.5 rounded-2xl border px-4 py-2.5 text-xs font-bold transition-all duration-200 ${
                activeSort === "reviews"
                  ? "border-emerald-500 bg-emerald-50 text-emerald-800 shadow-sm"
                  : "border-slate-200 bg-white text-slate-700 hover:border-emerald-300 hover:bg-slate-50"
              }`}
              onClick={handleSortByReviews}
            >
              <span>💬</span> Sort By Reviews
            </button>

            <button
              className={`inline-flex items-center gap-1.5 rounded-2xl border px-4 py-2.5 text-xs font-bold transition-all duration-200 ${
                activeSort === "ratings"
                  ? "border-amber-400 bg-amber-50 text-amber-900 shadow-sm"
                  : "border-slate-200 bg-white text-slate-700 hover:border-amber-300 hover:bg-slate-50"
              }`}
              onClick={handleSortByRatings}
            >
              <span>★</span> Sort By Ratings
            </button>
          </div>

          {/* Admin Add Restaurant Quick Trigger */}
          {isAuthenticated && user && user.role === "admin" && (
            <button
              onClick={handleOpenCreate}
              className="inline-flex items-center gap-2 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 px-4 py-2.5 text-xs font-bold text-white shadow-md shadow-emerald-600/20 transition hover:from-emerald-700 hover:to-teal-700 active:scale-95"
            >
              <span>+</span> Add New Restaurant
            </button>
          )}
        </div>

        {/* Search and restaurant results */}
        {restaurantsLoading ? (
          <Loader />
        ) : restaurantsError ? (
          <Message variant="danger">{restaurantsError}</Message>
        ) : (
          <>
          {restaurants && restaurants.length > 0 && (
            <>
              {keyword && <h2 className="mb-4 font-display text-2xl font-extrabold text-slate-900">Matching Restaurants</h2>}
              <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {restaurants.map((restaurant) =>
                !showVegOnly || restaurant.isVeg ? (
                  <Restaurant key={restaurant._id} restaurant={restaurant} />
                ) : null
              )}
              {isAuthenticated && user && user.role === "admin" && (
                <div
                  className="group flex min-h-[340px] cursor-pointer flex-col items-center justify-center rounded-3xl border-2 border-dashed border-emerald-300/80 bg-emerald-50/40 p-8 text-center transition-all duration-200 hover:border-emerald-500 hover:bg-emerald-50/80 hover:shadow-xl"
                  onClick={handleOpenCreate}
                >
                  <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-emerald-600 text-2xl font-bold text-white shadow-lg shadow-emerald-600/30 transition-transform duration-200 group-hover:scale-110">+</div>
                  <h4 className="font-display text-lg font-bold text-emerald-950">Add Partner Restaurant</h4>
                  <p className="mt-1 text-xs font-medium text-emerald-700">List new kitchen, address, pure-veg status & location</p>
                </div>
              )}
              </div>
            </>
          )}

          {keyword && foodItems.length > 0 && (
            <section className="mt-10">
              <h2 className="mb-4 font-display text-2xl font-extrabold text-slate-900">Matching Food Items</h2>
              <div className="grid gap-6 lg:grid-cols-2">
                {foodItems.map((foodItem) => (
                  <Fooditem
                    key={foodItem._id}
                    fooditem={foodItem}
                    restaurant={foodItem.restaurant?._id || foodItem.restaurant}
                  />
                ))}
              </div>
            </section>
          )}

          {(!restaurants.length && !foodItems.length) && (
            <div className="rounded-3xl border border-slate-200/80 bg-white p-12 text-center shadow-sm">
              <p className="text-4xl mb-3">🔍</p>
              <h3 className="text-xl font-bold text-slate-900">No results found</h3>
              <p className="mt-1 text-sm text-slate-500">Try another restaurant or food item keyword.</p>
            </div>
          )}
          </>
        )}
      </div>

      {/* Create Restaurant Modal */}
      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-slate-950/60 p-4 backdrop-blur-md">
          <div className="w-full max-w-lg rounded-3xl border border-slate-100 bg-white p-8 shadow-2xl animate-in fade-in zoom-in-95 duration-200">
            <div className="mb-6 flex items-center justify-between border-b border-slate-100 pb-4">
              <div>
                <h3 className="font-display text-xl font-extrabold text-slate-900">Create New Restaurant</h3>
                <p className="text-xs text-slate-500">Add restaurant metadata to the platform</p>
              </div>
              <button
                onClick={handleCloseCreate}
                className="rounded-full p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
              >
                ✕
              </button>
            </div>

            <form onSubmit={submitCreate} className="space-y-4">
              {createError && <Message variant="danger">{createError}</Message>}

              <div>
                <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-600">Restaurant Name</label>
                <input
                  type="text"
                  name="name"
                  value={newRestaurant.name}
                  onChange={handleChange}
                  placeholder="e.g. Gourmet Bistro"
                  className="w-full rounded-xl border border-slate-200 bg-slate-50/80 px-4 py-3 text-sm outline-none transition focus:border-emerald-500 focus:bg-white focus:ring-4 focus:ring-emerald-500/10"
                  required
                />
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-600">Address</label>
                <input
                  type="text"
                  name="address"
                  value={newRestaurant.address}
                  onChange={handleChange}
                  placeholder="e.g. 123 Main St, New York"
                  className="w-full rounded-xl border border-slate-200 bg-slate-50/80 px-4 py-3 text-sm outline-none transition focus:border-emerald-500 focus:bg-white focus:ring-4 focus:ring-emerald-500/10"
                  required
                />
              </div>

              <div className="flex items-center gap-3 py-1">
                <input
                  type="checkbox"
                  id="isVeg_check"
                  name="isVeg"
                  checked={newRestaurant.isVeg}
                  onChange={handleChange}
                  className="h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                />
                <label htmlFor="isVeg_check" className="text-sm font-semibold text-slate-700 cursor-pointer">
                  Pure Veg Restaurant
                </label>
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-600">Coordinates (lat, lng)</label>
                <input
                  type="text"
                  name="coordinates"
                  value={coordsInput}
                  onChange={handleChange}
                  placeholder="e.g. 40.77,-73.97"
                  className="w-full rounded-xl border border-slate-200 bg-slate-50/80 px-4 py-3 text-sm outline-none transition focus:border-emerald-500 focus:bg-white focus:ring-4 focus:ring-emerald-500/10"
                  required
                />
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-600">Image URL</label>
                <input
                  type="text"
                  name="imageUrl"
                  value={newRestaurant.imageUrl}
                  onChange={handleChange}
                  placeholder="https://images.unsplash.com/..."
                  className="w-full rounded-xl border border-slate-200 bg-slate-50/80 px-4 py-3 text-sm outline-none transition focus:border-emerald-500 focus:bg-white focus:ring-4 focus:ring-emerald-500/10"
                  required
                />
              </div>

              <div className="mt-6 flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={handleCloseCreate}
                  className="rounded-xl border border-slate-200 px-5 py-2.5 text-sm font-bold text-slate-700 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creating}
                  className="rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 px-6 py-2.5 text-sm font-bold text-white shadow-md transition hover:from-emerald-700 hover:to-teal-700 disabled:opacity-60"
                >
                  {creating ? "Creating..." : "Create Restaurant"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Home;
