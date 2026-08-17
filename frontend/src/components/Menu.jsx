import React, { useEffect, useState } from "react";
import { useSelector, useDispatch } from "react-redux";
import { useParams } from "react-router-dom";
import { getMenus, addItemToMenu, createMenu } from "../redux/actions/menuActions";
import { getRestaurants } from "../redux/actions/restaurantAction";
import Fooditem from "./Fooditem";
import Loader from "./layout/Loader";
import Message from "./Message";
import axios from "axios";

const Menu = () => {
  const { id } = useParams();
  const dispatch = useDispatch();

  const { menus, menuId, loading, error, addingItem, addError } = useSelector(
    (state) => state.menus
  );

  const { isAuthenticated, user } = useSelector((state) => state.user);

  const [showMenuCreate, setShowMenuCreate] = useState(false);
  const [newMenuCategory, setNewMenuCategory] = useState("");
  const [showAddModal, setShowAddModal] = useState(false);
  const [itemToAdd, setItemToAdd] = useState({ category: "", foodItemId: "" });
  const [availableItems, setAvailableItems] = useState([]);
  const [creatingFood, setCreatingFood] = useState(false);
  const [aiGenerating, setAiGenerating] = useState(false);

  const [newFood, setNewFood] = useState({
    name: "",
    price: "",
    description: "",
    stock: "",
    imageUrl: "",
  });

  useEffect(() => {
    dispatch(getMenus(id));
    dispatch(getRestaurants());
  }, [dispatch, id]);

  const fetchItems = async () => {
    try {
      const { data } = await axios.get(`/api/v1/eats/items/${id}`);
      setAvailableItems(data.data);
    } catch (err) {
      console.error("failed to load items", err);
    }
  };

  const submitMenuCreation = async (e) => {
    e.preventDefault();
    if (!newMenuCategory) return;

    const result = await dispatch(
      createMenu({ restaurantId: id, category: newMenuCategory })
    );

    if (createMenu.fulfilled.match(result)) {
      dispatch(getMenus(id));
      setShowMenuCreate(false);
      setNewMenuCategory("");
    }
  };

  const submitNewFood = async (e) => {
    e.preventDefault();
    setCreatingFood(true);
    try {
      const payload = {
        ...newFood,
        price: parseFloat(newFood.price) || 0,
        stock: parseInt(newFood.stock) || 0,
        restaurant: id,
      };

      const { data } = await axios.post("/api/v1/eats/item", payload, {
        headers: { "Content-Type": "application/json" },
        withCredentials: true,
      });

      const created = data.data;

      setAvailableItems((prev) => [...prev, created]);
      setItemToAdd({ ...itemToAdd, foodItemId: created._id });

      setNewFood({
        name: "",
        price: "",
        description: "",
        stock: "",
        imageUrl: "",
      });

      return created;
    } catch (err) {
      console.error("unable to create food item", err);
      alert(err.response?.data?.message || err.message);
      return null;
    } finally {
      setCreatingFood(false);
    }
  };

  return (
    <div className="mx-auto max-w-7xl space-y-8 px-4 py-8 sm:px-6">
      {/* Header bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200/80 pb-6">
        <div>
          <span className="text-xs font-bold uppercase tracking-wider text-emerald-700">Explore Culinary Menu</span>
          <h1 className="font-display text-3xl font-extrabold text-slate-900 sm:text-4xl">Restaurant Menu</h1>
        </div>

        {isAuthenticated && user && user.role === "admin" && (
          <button
            className="inline-flex items-center gap-2 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 px-5 py-2.5 text-xs font-bold text-white shadow-md shadow-emerald-600/20 transition hover:from-emerald-700 hover:to-teal-700 active:scale-95"
            onClick={() => setShowMenuCreate(true)}
          >
            <span>+</span> Create Menu Category
          </button>
        )}
      </div>

      {loading ? (
        <Loader />
      ) : error ? (
        <Message variant="danger">{error}</Message>
      ) : menus && menus.length > 0 ? (
        menus.map((menu) => {
          const deleteMenu = async () => {
            if (!window.confirm(`Delete the "${menu.category}" menu category?`)) return;
            try {
              await axios.delete(
                `/api/v1/eats/stores/${id}/menus/${menu._id}`,
                { withCredentials: true }
              );
              dispatch(getMenus(id));
            } catch (err) {
              console.error(err);
              alert(err.response?.data?.message || "Unable to delete menu");
            }
          };

          return (
            <div key={menu._id} className="rounded-3xl border border-slate-200/80 bg-white/80 p-6 shadow-xl backdrop-blur-xl sm:p-8">
              <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-100 pb-5">
                <div>
                  <span className="text-[10px] font-extrabold uppercase tracking-widest text-emerald-600">Category</span>
                  <h2 className="font-display text-2xl font-extrabold text-slate-900 sm:text-3xl">{menu.category}</h2>
                </div>

                {isAuthenticated && user && user.role === "admin" && (
                  <div className="flex items-center gap-2">
                    <button
                      className="rounded-xl border border-emerald-200 bg-emerald-50 px-3.5 py-2 text-xs font-bold text-emerald-700 transition hover:bg-emerald-600 hover:text-white"
                      onClick={() => {
                        setItemToAdd({
                          category: menu.category,
                          foodItemId: "",
                        });
                        fetchItems();
                        setShowAddModal(true);
                      }}
                    >
                      + Add Item
                    </button>

                    <button
                      className="rounded-xl bg-rose-50 px-3.5 py-2 text-xs font-bold text-rose-600 transition hover:bg-rose-600 hover:text-white"
                      onClick={deleteMenu}
                    >
                      Delete Category
                    </button>
                  </div>
                )}
              </div>

              <div className="mt-6">
                {menu.items && menu.items.length > 0 ? (
                  <div className="grid gap-5 lg:grid-cols-2">
                    {menu.items.map((fooditem) => (
                      <Fooditem
                        key={fooditem._id}
                        fooditem={fooditem}
                        restaurant={id}
                      />
                    ))}
                  </div>
                ) : (
                  <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50/50 p-8 text-center text-sm text-slate-500">
                    No food items available in this category yet.
                  </div>
                )}
              </div>
            </div>
          );
        })
      ) : (
        <div className="rounded-3xl border border-slate-200/80 bg-white p-12 text-center shadow-sm">
          <p className="text-4xl mb-3">🍽️</p>
          <h3 className="text-xl font-bold text-slate-900">No Menu Categories Yet</h3>
          <p className="mt-1 text-sm text-slate-500">Check back later or contact restaurant management.</p>
        </div>
      )}

      {/* Create Menu Category Modal */}
      {showMenuCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-slate-950/60 p-4 backdrop-blur-md">
          <div className="w-full max-w-md rounded-3xl border border-slate-100 bg-white p-8 shadow-2xl animate-in fade-in zoom-in-95 duration-200">
            <div className="mb-4 flex items-center justify-between border-b border-slate-100 pb-4">
              <h3 className="font-display text-xl font-extrabold text-slate-900">Create Menu Category</h3>
              <button onClick={() => setShowMenuCreate(false)} className="text-slate-400 hover:text-slate-600">✕</button>
            </div>

            <form onSubmit={submitMenuCreation} className="space-y-4">
              <div>
                <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-600">Category Name</label>
                <input
                  type="text"
                  value={newMenuCategory}
                  onChange={(e) => setNewMenuCategory(e.target.value)}
                  placeholder="e.g. Starters, Main Course, Desserts"
                  className="w-full rounded-xl border border-slate-200 bg-slate-50/80 px-4 py-3 text-sm outline-none transition focus:border-emerald-500 focus:bg-white focus:ring-4 focus:ring-emerald-500/10"
                  required
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-4">
                <button
                  className="rounded-xl border border-slate-200 px-4 py-2.5 text-xs font-bold text-slate-700 hover:bg-slate-50"
                  type="button"
                  onClick={() => setShowMenuCreate(false)}
                >
                  Cancel
                </button>
                <button
                  className="rounded-xl bg-emerald-600 px-5 py-2.5 text-xs font-bold text-white shadow-md hover:bg-emerald-700"
                  type="submit"
                >
                  Create Category
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Food Item Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-slate-950/60 p-4 backdrop-blur-md">
          <div className="w-full max-w-lg rounded-3xl border border-slate-100 bg-white p-8 shadow-2xl animate-in fade-in zoom-in-95 duration-200">
            <div className="mb-4 flex items-center justify-between border-b border-slate-100 pb-4">
              <h3 className="font-display text-xl font-extrabold text-slate-900">Add New Dish</h3>
              <button onClick={() => setShowAddModal(false)} className="text-slate-400 hover:text-slate-600">✕</button>
            </div>

            {addError && <Message variant="danger">{addError}</Message>}

            <form
              onSubmit={async (e) => {
                e.preventDefault();
                const created = await submitNewFood(e);
                if (created && created._id) {
                  dispatch(
                    addItemToMenu({
                      menuId,
                      category: itemToAdd.category,
                      foodItemId: created._id,
                      restaurantId: id,
                    })
                  ).then(() => {
                    dispatch(getMenus(id));
                    setShowAddModal(false);
                  });
                }
              }}
              className="space-y-4"
            >
              <div>
                <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-600">Target Category</label>
                <select
                  value={itemToAdd.category}
                  onChange={(e) => setItemToAdd({ ...itemToAdd, category: e.target.value })}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50/80 px-4 py-3 text-sm font-semibold text-slate-700 outline-none focus:border-emerald-500 focus:bg-white"
                  required
                >
                  <option value="">Select Category</option>
                  {menus.map((m) => (
                    <option key={m._id} value={m.category}>
                      {m.category}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-600">Dish Name</label>
                  <input
                    type="text"
                    placeholder="e.g. Truffle Mushroom Pasta"
                    value={newFood.name}
                    onChange={(e) => setNewFood({ ...newFood, name: e.target.value })}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50/80 px-4 py-2.5 text-sm outline-none focus:border-emerald-500 focus:bg-white"
                    required
                  />
                </div>

                <div>
                  <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-600">Price (₹)</label>
                  <input
                    type="number"
                    placeholder="299"
                    value={newFood.price}
                    onChange={(e) => setNewFood({ ...newFood, price: e.target.value })}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50/80 px-4 py-2.5 text-sm outline-none focus:border-emerald-500 focus:bg-white"
                    required
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-600">Description</label>
                  <button
                    type="button"
                    disabled={aiGenerating}
                    className="inline-flex items-center gap-1 text-xs font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 px-2.5 py-1 rounded-lg transition"
                    onClick={async () => {
                      if (!newFood.name) return alert("Enter dish name first");
                      setAiGenerating(true);
                      try {
                        const { data } = await axios.post(
                          "/api/v1/ai/generate-food-ai",
                          {
                            name: newFood.name,
                            category: itemToAdd.category || "",
                            spiceLevel: "Medium",
                            price: newFood.price || 0,
                          },
                          { withCredentials: true }
                        );
                        setNewFood({ ...newFood, description: data.data.description });
                      } catch (err) {
                        console.error(err);
                      } finally {
                        setAiGenerating(false);
                      }
                    }}
                  >
                    <span>✨</span> {aiGenerating ? "Generating..." : "Generate AI Description"}
                  </button>
                </div>
                <textarea
                  rows="2"
                  placeholder="Fresh ingredients, delicate herbs..."
                  value={newFood.description}
                  onChange={(e) => setNewFood({ ...newFood, description: e.target.value })}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50/80 px-4 py-2.5 text-sm outline-none focus:border-emerald-500 focus:bg-white"
                  required
                />
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-600">Stock Count</label>
                  <input
                    type="number"
                    placeholder="25"
                    value={newFood.stock}
                    onChange={(e) => setNewFood({ ...newFood, stock: e.target.value })}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50/80 px-4 py-2.5 text-sm outline-none focus:border-emerald-500 focus:bg-white"
                    required
                  />
                </div>

                <div>
                  <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-600">Image URL</label>
                  <input
                    type="text"
                    placeholder="https://..."
                    value={newFood.imageUrl}
                    onChange={(e) => setNewFood({ ...newFood, imageUrl: e.target.value })}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50/80 px-4 py-2.5 text-sm outline-none focus:border-emerald-500 focus:bg-white"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="rounded-xl border border-slate-200 px-4 py-2.5 text-xs font-bold text-slate-700 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creatingFood}
                  className="rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 px-5 py-2.5 text-xs font-bold text-white shadow-md hover:from-emerald-700 hover:to-teal-700 disabled:opacity-60"
                >
                  {creatingFood ? "Adding..." : "Add Food Item"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Menu;
