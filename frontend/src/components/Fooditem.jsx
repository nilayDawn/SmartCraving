import React, { useState, useEffect } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faIndianRupeeSign } from "@fortawesome/free-solid-svg-icons";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import {
  addItemToCart,
  updateCartQuantity,
  removeItemFromCart,
} from "../redux/actions/cartActions";
import axios from "axios";
import { getMenus } from "../redux/actions/menuActions";
import { Link } from "react-router-dom";

const Fooditem = ({ fooditem, restaurant }) => {
  const [quantity, setQuantity] = useState(1);
  const [showButtons, setShowButtons] = useState(false);

  const dispatch = useDispatch();
  const navigate = useNavigate();

  const { user } = useSelector((state) => state.user);
  const isAuthenticated = !!user;
  const { cartItems } = useSelector((state) => state.cart);

  useEffect(() => {
    const cartItem = cartItems.find(
      (item) => item.foodItem._id === fooditem._id
    );

    if (cartItem) {
      setQuantity(cartItem.quantity);
      setShowButtons(true);
    } else {
      setQuantity(1);
      setShowButtons(false);
    }
  }, [cartItems, fooditem]);

  const decreaseQty = () => {
    if (quantity > 1) {
      const newQuantity = quantity - 1;
      setQuantity(newQuantity);
      dispatch(updateCartQuantity(fooditem._id, newQuantity));
    } else {
      setQuantity(0);
      setShowButtons(false);
      dispatch(removeItemFromCart(fooditem._id));
    }
  };

  const increaseQty = () => {
    if (quantity < fooditem.stock) {
      const newQuantity = quantity + 1;
      setQuantity(newQuantity);
      dispatch(updateCartQuantity(fooditem._id, newQuantity));
    } else {
      alert("Exceeded available stock limit");
    }
  };

  const addToCartHandler = () => {
    if (!isAuthenticated) {
      return navigate("/users/login");
    }
    dispatch(addItemToCart(fooditem._id, restaurant, quantity));
    setShowButtons(true);
  };

  return (
    <div className="group relative flex h-full gap-4 rounded-3xl border border-slate-200/80 bg-white/95 p-4 shadow-sm backdrop-blur-xl transition-all duration-200 hover:-translate-y-0.5 hover:border-emerald-500/30 hover:shadow-xl">
      {/* Food Image */}
      <Link
        to={`/eats/food/${fooditem._id}?restaurant=${restaurant}`}
        className="relative order-2 block h-28 w-28 shrink-0 overflow-hidden rounded-2xl sm:h-32 sm:w-32 bg-slate-100"
      >
        <img
          className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
          src={fooditem.images?.[0]?.url || "/images/template.jpeg"}
          alt={fooditem.name}
        />
        {fooditem.stock === 0 && (
          <div className="absolute inset-0 flex items-center justify-center bg-slate-950/70 p-2 text-center text-[10px] font-bold text-white uppercase tracking-wider backdrop-blur-xs">
            Out of Stock
          </div>
        )}
      </Link>

      {/* Item Body */}
      <div className="flex min-w-0 flex-1 flex-col justify-between">
        <div>
          <div className="flex items-start justify-between gap-2">
            <Link
              to={`/eats/food/${fooditem._id}?restaurant=${restaurant}`}
              className="font-display text-base font-bold text-slate-900 transition hover:text-emerald-600 line-clamp-1"
            >
              {fooditem.name}
            </Link>
          </div>

          <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-slate-500">
            {fooditem.description}
          </p>
        </div>

        <div className="mt-3 pt-2 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2">
          {/* Price & Stock Pill */}
          <div className="flex items-center gap-2">
            <span className="font-display text-lg font-black text-slate-900">
              <FontAwesomeIcon icon={faIndianRupeeSign} size="xs" className="mr-0.5 text-xs text-emerald-600" />
              {fooditem.price}
            </span>
            <span
              className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold ${
                fooditem.stock > 0
                  ? "bg-emerald-50 text-emerald-700"
                  : "bg-rose-50 text-rose-600"
              }`}
            >
              <span className={`h-1.5 w-1.5 rounded-full ${fooditem.stock > 0 ? "bg-emerald-500" : "bg-rose-500"}`} />
              {fooditem.stock > 0 ? "In Stock" : "Unavailable"}
            </span>
          </div>

          {/* Action Control */}
          {!showButtons ? (
            (!isAuthenticated || user?.role !== "admin") && (
              <button
                id="cart_btn"
                className="rounded-xl bg-emerald-600 px-4 py-2 text-xs font-bold text-white shadow-sm shadow-emerald-600/20 transition hover:bg-emerald-700 active:scale-95 disabled:cursor-not-allowed disabled:opacity-50"
                disabled={fooditem.stock === 0}
                onClick={addToCartHandler}
              >
                + Add
              </button>
            )
          ) : (
            <div className="flex items-center rounded-xl bg-slate-100/80 p-1 border border-slate-200/80">
              <button
                onClick={decreaseQty}
                className="flex h-7 w-7 items-center justify-center rounded-lg bg-white text-xs font-bold text-slate-700 shadow-xs transition hover:bg-slate-200"
              >
                −
              </button>

              <span className="w-8 text-center text-xs font-black text-slate-900">
                {quantity}
              </span>

              <button
                onClick={increaseQty}
                className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-600 text-xs font-bold text-white shadow-xs transition hover:bg-emerald-700"
              >
                +
              </button>
            </div>
          )}

          {/* Admin Delete Action */}
          {isAuthenticated && user?.role === "admin" && (
            <button
              className="rounded-xl bg-rose-50 px-2.5 py-1.5 text-xs font-bold text-rose-600 transition hover:bg-rose-600 hover:text-white"
              onClick={async () => {
                if (!window.confirm("Delete this food item?")) return;
                try {
                  await axios.delete(`/api/v1/eats/item/${fooditem._id}`, {
                    withCredentials: true,
                  });
                  if (restaurant) {
                    dispatch(getMenus(restaurant));
                  }
                } catch (err) {
                  console.error(err);
                  alert(err.response?.data?.message || "Unable to delete item");
                }
              }}
            >
              🗑 Delete
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default Fooditem;
