import React, { useEffect } from "react";
import { Link, useParams } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { toast } from "react-toastify";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faIndianRupeeSign } from "@fortawesome/free-solid-svg-icons";

import Loader from "../layout/Loader";
import { getOrderDetails } from "../../redux/actions/orderActions";
import { clearErrors } from "../../redux/slices/orderSlice";

const OrderDetails = () => {
  const dispatch = useDispatch();
  const { id } = useParams();

  const { loading, error, order } = useSelector((state) => state.order);

  useEffect(() => {
    dispatch(getOrderDetails(id));
  }, [dispatch, id]);

  useEffect(() => {
    if (error) {
      toast.error(error, { position: "bottom-right" });
      dispatch(clearErrors());
    }
  }, [error, dispatch]);

  const {
    _id,
    deliveryInfo = {},
    orderItems = [],
    paymentInfo = {},
    user = {},
    finalTotal,
    orderStatus = "Pending",
  } = order || {};

  const deliveryDetails = deliveryInfo
    ? `${deliveryInfo.address || ""}, ${deliveryInfo.city || ""}, ${
        deliveryInfo.postalCode || ""
      }, ${deliveryInfo.country || ""}`
    : "";

  const isPaid = paymentInfo?.status === "paid";
  const isDelivered = orderStatus.toLowerCase().includes("delivered");

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 space-y-8">
      {/* Back button & Order Header */}
      <div className="border-b border-slate-200/80 pb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <Link to="/eats/orders/me/myOrders" className="text-xs font-bold text-emerald-700 hover:underline flex items-center gap-1 mb-1">
            <span>←</span> Back to My Orders
          </Link>
          <h1 className="font-display text-3xl font-extrabold text-slate-900 sm:text-4xl">
            Order <span className="font-mono text-emerald-600">#{_id?.slice(-8)}</span>
          </h1>
          <p className="text-xs text-slate-500 font-mono mt-0.5">Full Order ID: {_id}</p>
        </div>

        {/* Status Pill Badge */}
        <div className="flex items-center gap-3">
          <span
            className={`inline-flex items-center gap-1.5 rounded-2xl px-4 py-2 text-xs font-bold ${
              isDelivered
                ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                : "bg-amber-50 text-amber-800 border border-amber-200"
            }`}
          >
            <span className={`h-2 w-2 rounded-full ${isDelivered ? "bg-emerald-500" : "bg-amber-500 animate-pulse"}`} />
            {orderStatus}
          </span>
        </div>
      </div>

      {loading ? (
        <Loader />
      ) : (
        <div className="grid gap-8 lg:grid-cols-[1fr_360px]">
          {/* Main Info */}
          <div className="space-y-6">
            {/* Delivery Information Card */}
            <div className="rounded-3xl border border-slate-200/80 bg-white/95 p-6 shadow-xl backdrop-blur-xl space-y-4">
              <h2 className="font-display text-lg font-bold text-slate-900 flex items-center gap-2">
                <span>📍</span> Delivery Information
              </h2>
              <div className="grid gap-3 sm:grid-cols-2 text-sm">
                <div>
                  <span className="text-xs font-bold uppercase text-slate-400">Recipient Name</span>
                  <p className="font-bold text-slate-900">{user?.name || "N/A"}</p>
                </div>
                <div>
                  <span className="text-xs font-bold uppercase text-slate-400">Phone Number</span>
                  <p className="font-bold text-slate-900">{deliveryInfo?.phoneNo || "N/A"}</p>
                </div>
                <div className="sm:col-span-2">
                  <span className="text-xs font-bold uppercase text-slate-400">Shipping Address</span>
                  <p className="font-semibold text-slate-700">{deliveryDetails || "N/A"}</p>
                </div>
              </div>
            </div>

            {/* Ordered Items List */}
            <div className="rounded-3xl border border-slate-200/80 bg-white/95 p-6 shadow-xl backdrop-blur-xl space-y-4">
              <h2 className="font-display text-lg font-bold text-slate-900 flex items-center gap-2">
                <span>🍽️</span> Ordered Items ({orderItems.length})
              </h2>

              <div className="divide-y divide-slate-100">
                {orderItems.length > 0 ? (
                  orderItems.map((item, index) => (
                    <div key={item._id || index} className="flex items-center gap-4 py-4 first:pt-0 last:pb-0">
                      <img
                        src={item.image || "/images/template.jpeg"}
                        alt={item.name}
                        className="h-16 w-16 shrink-0 rounded-2xl object-cover ring-1 ring-slate-100"
                      />
                      <div className="min-w-0 flex-1">
                        <h4 className="font-display font-bold text-slate-900">{item.name}</h4>
                        <p className="text-xs font-medium text-slate-500">
                          ₹{item.price} × {item.quantity} qty
                        </p>
                      </div>
                      <div className="text-right">
                        <span className="font-display font-black text-slate-900">
                          ₹{(item.price * item.quantity).toFixed(2)}
                        </span>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-slate-500">No items found in this order.</p>
                )}
              </div>
            </div>
          </div>

          {/* Sidebar Payment & Summary */}
          <aside className="h-fit space-y-6">
            <div className="rounded-3xl border border-slate-200/80 bg-white/95 p-6 shadow-xl backdrop-blur-xl space-y-5">
              <h2 className="font-display text-lg font-bold text-slate-900">Payment Summary</h2>

              <div className="space-y-3 text-sm">
                <div className="flex justify-between items-center text-slate-600">
                  <span>Payment Method</span>
                  <span className="font-bold text-slate-900">Stripe Credit Card</span>
                </div>

                <div className="flex justify-between items-center text-slate-600">
                  <span>Payment Status</span>
                  <span
                    className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-bold ${
                      isPaid ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-700"
                    }`}
                  >
                    {isPaid ? "✓ PAID" : "UNPAID"}
                  </span>
                </div>
              </div>

              <div className="border-t border-slate-100 pt-4 flex items-center justify-between">
                <span className="font-display text-base font-bold text-slate-900">Total Paid</span>
                <span className="font-display text-2xl font-black text-emerald-600">
                  <FontAwesomeIcon icon={faIndianRupeeSign} size="xs" className="mr-0.5 text-base" />
                  {finalTotal || 0}
                </span>
              </div>
            </div>
          </aside>
        </div>
      )}
    </div>
  );
};

export default OrderDetails;