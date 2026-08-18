import React, { useEffect, useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
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
import api from "../../utils/api";

const COUPON_CACHE_TTL = 60 * 1000;
let couponCache = null;

const Cart = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const { user } = useSelector((state) => state.user);
  const { error: orderError } = useSelector((state) => state.order);
  const { cartItems, restaurant } = useSelector((state) => state.cart);
  const isAdmin = user?.role === "admin";
  const [coupons, setCoupons] = useState([]);
  const [couponCode, setCouponCode] = useState("");
  const [appliedCoupon, setAppliedCoupon] = useState(null);
  const [couponLoading, setCouponLoading] = useState(false);

  useEffect(() => {
    if (!isAdmin) dispatch(fetchCartItems());
  }, [dispatch, isAdmin]);

  useEffect(() => {
    if (isAdmin) return;
    if (couponCache && Date.now() - couponCache.timestamp < COUPON_CACHE_TTL) {
      setCoupons(couponCache.value);
      return undefined;
    }

    const controller = new AbortController();
    api.get("/v1/coupon", { signal: controller.signal })
      .then(({ data }) => {
        const value = data.data || [];
        couponCache = { timestamp: Date.now(), value };
        setCoupons(value);
      })
      .catch((error) => {
        if (error.code !== "ERR_CANCELED") setCoupons([]);
      });

    return () => controller.abort();
  }, [isAdmin]);

  useEffect(() => {
    if (orderError) toast.error(orderError);
  }, [orderError]);

  if (isAdmin) return <Navigate to="/admin/orders" replace />;

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
    dispatch(payment(cartItems, restaurant, appliedCoupon?.couponName));
  };

  const total = cartItems.reduce(
    (acc, item) => acc + item.quantity * item.foodItem.price,
    0
  );

  useEffect(() => {
    // A coupon is calculated against the current subtotal. Require reapplying
    // it when quantities change so the checkout amount stays accurate.
    if (appliedCoupon) setAppliedCoupon(null);
  }, [total]);

  const applyCoupon = async (code = couponCode) => {
    const normalizedCode = code.trim().toUpperCase();
    if (!normalizedCode) {
      toast.error("Enter a coupon code");
      return;
    }

    try {
      setCouponLoading(true);
      const { data } = await api.post("/v1/coupon/validate", {
        couponCode: normalizedCode,
        cartItemsTotalAmount: total,
      });
      setAppliedCoupon(data.data);
      setCouponCode(data.data.couponName);
      toast.success(`${data.data.couponName} applied`);
    } catch (error) {
      setAppliedCoupon(null);
      toast.error(error.response?.data?.message || "Unable to apply coupon");
    } finally {
      setCouponLoading(false);
    }
  };

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
              <button
                type="button"
                onClick={() => navigate(`/eats/food/${item.foodItem._id}`)}
                className="shrink-0 rounded-2xl focus:outline-none focus:ring-2 focus:ring-emerald-500"
                aria-label={`View details for ${item.foodItem.name}`}
              >
                <img
                  src={item.foodItem.images?.[0]?.url || "/images/template.jpeg"}
                  alt={item.foodItem.name}
                  className="h-24 w-24 rounded-2xl object-cover ring-1 ring-slate-100 shadow-sm transition hover:scale-105"
                />
              </button>

              <div className="min-w-0 flex-1 w-full space-y-1">
                <div className="flex items-start justify-between gap-2">
              <h3 className="font-display text-base font-bold text-slate-900">
                    <button
                      type="button"
                      onClick={() => navigate(`/eats/food/${item.foodItem._id}`)}
                      className="text-left hover:text-emerald-700 hover:underline"
                    >
                      {item.foodItem.name}
                    </button>
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

          <div className="space-y-3 rounded-2xl border border-emerald-100 bg-emerald-50/70 p-4">
            <div className="flex items-center justify-between gap-2">
              <div>
                <h3 className="text-sm font-extrabold text-slate-900">Have a coupon?</h3>
                <p className="text-xs text-slate-500">Apply an offer before payment.</p>
              </div>
              {appliedCoupon && <span className="text-xs font-bold text-emerald-700">Applied</span>}
            </div>
            <div className="flex gap-2">
              <input
                value={couponCode}
                onChange={(event) => setCouponCode(event.target.value.toUpperCase())}
                placeholder="Enter code"
                className="min-w-0 flex-1 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold uppercase outline-none focus:border-emerald-500"
              />
              <button
                type="button"
                onClick={() => applyCoupon()}
                disabled={couponLoading}
                className="rounded-xl bg-slate-900 px-3 py-2 text-xs font-bold text-white hover:bg-emerald-700 disabled:opacity-60"
              >
                {couponLoading ? "..." : "Apply"}
              </button>
            </div>
            {coupons.length > 0 && (
              <div className="space-y-2 pt-1">
                <p className="text-[11px] font-bold uppercase tracking-wide text-emerald-700">Available offers</p>
                {coupons.filter((coupon) => new Date(coupon.expire) > new Date()).map((coupon) => (
                  <button
                    key={coupon._id}
                    type="button"
                    onClick={() => { setCouponCode(coupon.couponName); applyCoupon(coupon.couponName); }}
                    className="flex w-full items-center justify-between rounded-xl bg-white px-3 py-2 text-left ring-1 ring-emerald-100 transition hover:ring-emerald-300"
                  >
                    <span><span className="block text-xs font-black text-emerald-700">{coupon.couponName}</span><span className="block text-[11px] text-slate-500">{coupon.subTitle}</span></span>
                    <span className="text-xs font-black text-slate-700">{coupon.discount}% off</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {appliedCoupon && (
            <div className="space-y-2 border-t border-slate-100 pt-4 text-sm">
              <div className="flex justify-between text-emerald-700"><span>Coupon discount</span><span className="font-bold">-₹{appliedCoupon.discount.toFixed(2)}</span></div>
              <div className="flex justify-between text-slate-600"><span>Discounted subtotal</span><span className="font-bold text-slate-900">₹{appliedCoupon.finalTotal.toFixed(2)}</span></div>
            </div>
          )}

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
              {(appliedCoupon?.finalTotal ?? total).toFixed(2)}
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
