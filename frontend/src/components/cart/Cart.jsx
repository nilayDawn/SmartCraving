import React, { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import {
  fetchCartItems,
  removeItemFromCart,
  updateCartQuantity,
} from "../../redux/actions/cartActions";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faIndianRupee } from "@fortawesome/free-solid-svg-icons";
import { payment } from "../../redux/actions/orderActions";
import { toast } from "react-toastify";

const Cart = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const { cartItems, restaurant } = useSelector((state) => state.cart);

  useEffect(() => {
    dispatch(fetchCartItems());
  }, [dispatch]);

  const removeCartItemHandler = (id) => {
    dispatch(removeItemFromCart(id));
    toast.success("Item removed from cart");
  };

  const increaseQty = (id, quantity, stock) => {
    const newQty = quantity + 1;
    if (newQty > stock) {
      toast.error("Exceeded stock limit");
      return;
    }
    dispatch(updateCartQuantity(id, newQty));
  };

  const decreaseQty = (id, quantity) => {
    if (quantity > 1) {
      const newQty = quantity - 1;
      dispatch(updateCartQuantity(id, newQty));
    } else {
      toast.error("Minimum quantity reached");
    }
  };

  const checkoutHandler = () => {
    dispatch(payment(cartItems, restaurant));
  };

  const total = cartItems.reduce(
    (acc, item) => acc + item.quantity * item.foodItem.price,
    0
  );

  return cartItems.length === 0 ? (
    <div className="mx-auto max-w-xl rounded-3xl border border-slate-200/80 bg-white/95 p-12 text-center shadow-xl backdrop-blur-xl my-12">
      <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-3xl bg-emerald-50 text-4xl shadow-inner">
        🛍️
      </div>
      <h2 className="font-display text-2xl font-extrabold text-slate-900">Your Cart is Empty</h2>
      <p className="mt-2 text-sm text-slate-500 max-w-md mx-auto">
        Explore our curated selection of top restaurants and chef specialties to fill your basket.
      </p>
      <button
        onClick={() => navigate("/")}
        className="mt-6 inline-flex items-center gap-2 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 px-6 py-3.5 font-display text-sm font-bold text-white shadow-lg shadow-emerald-600/20 transition hover:from-emerald-700 hover:to-teal-700 active:scale-95"
      >
        <span>🔍 Explore Menu & Restaurants</span>
      </button>
    </div>
  ) : (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 space-y-8">
      {/* Header section */}
      <div className="border-b border-slate-200/80 pb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <span className="text-xs font-bold uppercase tracking-wider text-emerald-700">Checkout & Review</span>
          <h1 className="font-display text-3xl font-extrabold text-slate-900 sm:text-4xl">
            Shopping Cart <span className="text-emerald-600 font-bold">({cartItems.length} items)</span>
          </h1>
          {restaurant?.name && (
            <p className="mt-1 text-sm font-semibold text-slate-500 flex items-center gap-1.5">
              <span>🏪</span> Ordering from <span className="text-slate-900 font-bold">{restaurant.name}</span>
            </p>
          )}
        </div>

        <button
          onClick={() => navigate("/")}
          className="text-xs font-bold text-emerald-700 hover:text-emerald-800 flex items-center gap-1 bg-emerald-50 px-3.5 py-2 rounded-xl transition"
        >
          <span>←</span> Add More Dishes
        </button>
      </div>

      <div className="grid gap-8 lg:grid-cols-[1fr_400px]">
        {/* Left Column: Cart Items */}
        <div className="space-y-4">
          {cartItems.map((item) => (
            <div
              key={item._id}
              className="group flex flex-col sm:flex-row items-center gap-4 rounded-3xl border border-slate-200/80 bg-white/95 p-5 shadow-sm backdrop-blur-xl transition duration-200 hover:border-emerald-300 hover:shadow-md"
            >
              <img
                src={item.foodItem.images?.[0]?.url || "/images/template.jpeg"}
                alt={item.foodItem.name}
                className="h-24 w-24 shrink-0 rounded-2xl object-cover ring-1 ring-slate-100 shadow-sm"
              />

              <div className="min-w-0 flex-1 w-full space-y-1">
                <div className="flex items-start justify-between gap-2">
                  <h3 className="font-display text-base font-bold text-slate-900">
                    {item.foodItem.name}
                  </h3>
                  <span className="font-display text-lg font-black text-slate-900">
                    <FontAwesomeIcon icon={faIndianRupee} size="xs" className="mr-0.5 text-xs text-emerald-600" />
                    {(item.foodItem.price * item.quantity).toFixed(2)}
                  </span>
                </div>

                <p className="text-xs font-medium text-slate-500">
                  ₹{item.foodItem.price} each
                </p>

                <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between gap-3">
                  {/* Quantity adjustment */}
                  <div className="flex items-center rounded-xl bg-slate-100 p-1 border border-slate-200/60">
                    <button
                      className="flex h-8 w-8 items-center justify-center rounded-lg bg-white font-bold text-slate-700 shadow-xs transition hover:bg-slate-200"
                      onClick={() => decreaseQty(item.foodItem._id, item.quantity)}
                    >
                      −
                    </button>
                    <span className="w-10 text-center font-display text-sm font-black text-slate-900">
                      {item.quantity}
                    </span>
                    <button
                      className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-600 font-bold text-white shadow-xs transition hover:bg-emerald-700"
                      onClick={() => increaseQty(item.foodItem._id, item.quantity, item.foodItem.stock)}
                    >
                      +
                    </button>
                  </div>

                  <button
                    className="inline-flex items-center gap-1.5 rounded-xl bg-rose-50 px-3 py-1.5 text-xs font-bold text-rose-600 transition hover:bg-rose-600 hover:text-white"
                    onClick={() => removeCartItemHandler(item.foodItem._id)}
                  >
                    <span>🗑</span> Remove
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Right Column: Order Summary Card */}
        <aside className="h-fit rounded-3xl border border-slate-200/80 bg-white/95 p-6 shadow-xl backdrop-blur-xl lg:sticky lg:top-24 space-y-6">
          <div className="border-b border-slate-100 pb-4">
            <h2 className="font-display text-xl font-extrabold text-slate-900">Order Summary</h2>
            <p className="text-xs text-slate-500">Taxes and delivery calculated at checkout</p>
          </div>

          <div className="space-y-3 text-sm">
            <div className="flex justify-between text-slate-600">
              <span>Subtotal ({cartItems.reduce((acc, item) => acc + Number(item.quantity), 0)} items)</span>
              <span className="font-bold text-slate-900">₹{total.toFixed(2)}</span>
            </div>

            <div className="flex justify-between text-slate-600">
              <span>Estimated Delivery Fee</span>
              <span className="font-bold text-emerald-600">FREE ⚡</span>
            </div>

            <div className="flex justify-between text-slate-600">
              <span>GST & Restaurant Packaging</span>
              <span className="font-bold text-slate-900">₹0.00</span>
            </div>
          </div>

          <div className="border-t border-slate-100 pt-4 flex items-center justify-between">
            <span className="font-display text-lg font-bold text-slate-900">Total Amount</span>
            <span className="font-display text-2xl font-black text-emerald-600">
              <FontAwesomeIcon icon={faIndianRupee} size="xs" className="mr-0.5 text-base" />
              {total.toFixed(2)}
            </span>
          </div>

          <button
            onClick={checkoutHandler}
            className="w-full rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 py-4 font-display text-base font-bold text-white shadow-lg shadow-emerald-600/30 transition-all duration-200 hover:-translate-y-0.5 hover:from-emerald-700 hover:to-teal-700 hover:shadow-xl active:scale-[0.98]"
          >
            🔒 Proceed to Payment
          </button>

          <div className="rounded-2xl bg-slate-50 p-3.5 text-center text-xs font-semibold text-slate-500 flex items-center justify-center gap-2">
            <span>🛡️</span> 100% Encrypted & Safe Stripe Checkout
          </div>
        </aside>
      </div>
    </div>
  );
};

export default Cart;
