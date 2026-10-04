import React, { useEffect, useState } from "react";
import { toast } from "react-toastify";
import api from "../../utils/api";

const ORDER_STATUSES = [
  "Processing",
  "Confirmed",
  "Preparing",
  "Out for delivery",
  "Delivered",
  "Cancelled",
];

const TERMINAL_STATUSES = ["Delivered", "Cancelled"];

const getAvailableStatuses = (currentStatus) => {
  if (TERMINAL_STATUSES.includes(currentStatus)) return [currentStatus];

  const currentIndex = ORDER_STATUSES.indexOf(currentStatus);
  const nextStatus = ORDER_STATUSES[currentIndex + 1];

  return [currentStatus, nextStatus, "Cancelled"].filter(
    (status, index, statuses) => status && statuses.indexOf(status) === index,
  );
};

const AdminOrders = () => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState(null);
  const [statusDrafts, setStatusDrafts] = useState({});
  const [messageDrafts, setMessageDrafts] = useState({});

  useEffect(() => {
    const controller = new AbortController();
    let active = true;
    const loadOrders = async () => {
      try {
        const { data } = await api.get("/v1/eats/orders/admin", { signal: controller.signal });
        if (active) setOrders(data.orders || []);
      } catch (error) {
        if (active && error.code !== "ERR_CANCELED") {
          toast.error(error.response?.data?.message || "Failed to load orders");
        }
      } finally {
        if (active) setLoading(false);
      }
    };

    loadOrders();
    const refreshTimer = setInterval(loadOrders, 30000);
    return () => {
      active = false;
      clearInterval(refreshTimer);
      controller.abort();
    };
  }, []);

  const updateStatus = async (orderId) => {
    const order = orders.find((currentOrder) => currentOrder._id === orderId);
    const status = statusDrafts[orderId] ?? order?.orderStatus;
    const adminMessage = messageDrafts[orderId] ?? order?.adminMessage ?? "";

    try {
      setUpdatingId(orderId);
      const { data } = await api.patch(`/v1/eats/orders/${orderId}/status`, {
        status,
        adminMessage,
      });
      setOrders((currentOrders) =>
        currentOrders.map((order) => (order._id === orderId ? data.order : order)),
      );
      setStatusDrafts((current) => ({ ...current, [orderId]: data.order.orderStatus }));
      setMessageDrafts((current) => ({ ...current, [orderId]: data.order.adminMessage || "" }));
      toast.success("Order status updated");
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to update order status");
    } finally {
      setUpdatingId(null);
    }
  };

  return (
    <section className="mx-auto max-w-7xl space-y-6 py-6">
      <div>
        <p className="text-xs font-bold uppercase tracking-wider text-emerald-700">Admin orders</p>
        <h1 className="mt-1 font-display text-3xl font-extrabold text-slate-900">Restaurant Orders</h1>
        <p className="mt-2 text-sm text-slate-500">Review incoming orders and keep customers updated.</p>
      </div>

      <div className="overflow-x-auto rounded-3xl border border-slate-200 bg-white shadow-sm">
        {loading ? (
          <p className="p-8 text-center text-sm text-slate-500">Loading orders...</p>
        ) : orders.length === 0 ? (
          <p className="p-8 text-center text-sm text-slate-500">No restaurant orders yet.</p>
        ) : (
          <table className="min-w-full text-left text-sm">
            <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-5 py-4">Order</th>
                <th className="px-5 py-4">Restaurant</th>
                <th className="px-5 py-4">Customer</th>
                <th className="px-5 py-4">Ordered Items</th>
                <th className="px-5 py-4">Total</th>
                <th className="px-5 py-4">Status & message</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {orders.map((order) => (
                <tr key={order._id} className="align-top">
                  <td className="px-5 py-4 font-semibold text-slate-900">
                    <span className="block font-mono font-bold">#{order._id.slice(-6).toUpperCase()}</span>
                    <span className="mt-1 block text-xs font-normal text-slate-500">
                      {new Date(order.createdAt).toLocaleString()}
                    </span>
                  </td>
                  <td className="px-5 py-4 font-medium text-slate-800">{order.restaurant?.name || "Unknown restaurant"}</td>
                  <td className="px-5 py-4 text-slate-700">
                    <span className="block font-semibold text-slate-900">{order.user?.name || "Unknown customer"}</span>
                    <span className="text-xs text-slate-500">{order.user?.email}</span>
                  </td>
                  <td className="px-5 py-4">
                    <div className="space-y-2.5 max-w-xs">
                      {order.orderItems && order.orderItems.length > 0 ? (
                        order.orderItems.map((item, idx) => {
                          const stockCount = item.fooditem?.stock;
                          const hasStock = typeof stockCount === "number";
                          const itemImg = item.image || item.fooditem?.images?.[0]?.url;

                          return (
                            <div key={item._id || idx} className="flex items-center gap-2.5 rounded-xl border border-slate-100 bg-slate-50/60 p-2">
                              {itemImg ? (
                                <img
                                  src={itemImg}
                                  alt={item.name}
                                  className="h-10 w-10 shrink-0 rounded-lg object-cover border border-slate-200"
                                  onError={(e) => {
                                    e.target.onerror = null;
                                    e.target.src = "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=400";
                                  }}
                                />
                              ) : (
                                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-emerald-100 text-emerald-700 font-bold text-xs">
                                  🍲
                                </div>
                              )}
                              <div className="min-w-0 flex-1">
                                <p className="truncate text-xs font-bold text-slate-900">{item.name}</p>
                                <div className="flex items-center justify-between gap-1 text-[11px] text-slate-500 mt-0.5">
                                  <span>
                                    {item.quantity}x @ ₹{item.price}
                                  </span>
                                  {hasStock && (
                                    <span
                                      className={`rounded-md px-1.5 py-0.5 text-[10px] font-extrabold ${
                                        stockCount > 0 ? "bg-emerald-100 text-emerald-800" : "bg-rose-100 text-rose-700"
                                      }`}
                                    >
                                      {stockCount > 0 ? `${stockCount} in stock` : "Out of stock"}
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>
                          );
                        })
                      ) : (
                        <span className="text-xs text-slate-400 italic">No item details</span>
                      )}
                    </div>
                  </td>
                  <td className="px-5 py-4 font-bold text-slate-900">₹{Number(order.finalTotal || 0).toFixed(2)}</td>
                  <td className="px-5 py-4">
                    <div className="min-w-[230px] max-w-[280px] space-y-2">
                      {TERMINAL_STATUSES.includes(order.orderStatus) ? (
                        <div className="space-y-2">
                          <span className="inline-flex rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-700">
                            {order.orderStatus}
                          </span>
                          {order.adminMessage && (
                            <p className="rounded-xl bg-slate-50 px-3 py-2 text-xs text-slate-600">
                              {order.adminMessage}
                            </p>
                          )}
                        </div>
                      ) : (
                        <>
                          <select
                            value={statusDrafts[order._id] ?? order.orderStatus}
                            disabled={updatingId === order._id}
                            onChange={(event) =>
                              setStatusDrafts((current) => ({
                                ...current,
                                [order._id]: event.target.value,
                              }))
                            }
                            className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-xs font-semibold text-slate-700 outline-none focus:border-emerald-500 disabled:opacity-60"
                          >
                            {getAvailableStatuses(order.orderStatus).map((status) => (
                              <option key={status} value={status}>{status}</option>
                            ))}
                          </select>
                          <textarea
                            value={messageDrafts[order._id] ?? order.adminMessage ?? ""}
                            disabled={updatingId === order._id}
                            maxLength={500}
                            rows={2}
                            placeholder="Optional message for customer"
                            onChange={(event) =>
                              setMessageDrafts((current) => ({
                                ...current,
                                [order._id]: event.target.value,
                              }))
                            }
                            className="w-full resize-none rounded-xl border border-slate-200 px-3 py-2.5 text-xs text-slate-700 outline-none placeholder:text-slate-400 focus:border-emerald-500 disabled:opacity-60"
                          />
                          <button
                            type="button"
                            disabled={updatingId === order._id}
                            onClick={() => updateStatus(order._id)}
                            className="w-full rounded-xl bg-emerald-600 px-3 py-2.5 text-xs font-bold text-white transition hover:bg-emerald-700 disabled:opacity-60"
                          >
                            {updatingId === order._id ? "Saving..." : "Save update"}
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </section>
  );
};

export default AdminOrders;
