import React, { useEffect, useRef } from "react";
import { Link, useLocation } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { createOrder } from "../../redux/actions/orderActions";
import { clearErrors } from "../../redux/slices/orderSlice";
import { toast } from "react-toastify";

const OrderSuccess = () => {
  const location = useLocation();
  const dispatch = useDispatch();

  const hasCalled = useRef(false);

  const { error, order } = useSelector((state) => state.order);

  const searchParams = new URLSearchParams(location.search);
  const session_id = searchParams.get("session_id");

  useEffect(() => {
    if (!session_id || hasCalled.current) return;

    hasCalled.current = true;

    dispatch(createOrder(session_id));
  }, [dispatch, session_id]);

  useEffect(() => {
    if (order) {
      toast.success("Order placed successfully 🎉", {
        position: "bottom-right",
      });
    }

    if (error) {
      toast.error(error, { position: "bottom-right" });
      dispatch(clearErrors());
    }
  }, [order, error, dispatch]);

  return (
    <div className="mx-auto max-w-lg px-4 py-16 text-center">
      <div className="rounded-3xl border border-slate-200/80 bg-white/95 p-10 shadow-2xl backdrop-blur-xl space-y-6">
        <div className="mx-auto flex h-24 w-24 items-center justify-center rounded-full bg-emerald-100/80 text-emerald-600 text-4xl shadow-inner animate-bounce">
          🎉
        </div>

        <div>
          <span className="text-xs font-bold uppercase tracking-wider text-emerald-600">Payment Confirmed</span>
          <h1 className="font-display text-2xl font-black text-slate-900 mt-1 sm:text-3xl">
            Order Placed Successfully!
          </h1>
          <p className="mt-2 text-sm text-slate-500">
            Thank you for your order. The restaurant is preparing your food with love.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-4 border-t border-slate-100">
          <Link
            to="/eats/orders/me/myOrders"
            className="w-full sm:w-auto rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 px-6 py-3 text-xs font-bold text-white shadow-md shadow-emerald-600/20 transition hover:from-emerald-700 hover:to-teal-700 active:scale-95"
          >
            View My Orders
          </Link>
          <Link
            to="/"
            className="w-full sm:w-auto rounded-2xl border border-slate-200 bg-slate-50 px-6 py-3 text-xs font-bold text-slate-700 transition hover:bg-slate-100 active:scale-95"
          >
            Back to Home
          </Link>
        </div>
      </div>
    </div>
  );
};

export default OrderSuccess;