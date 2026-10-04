import React, { useEffect, useState, useMemo } from "react";
import { Link } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { toast } from "react-toastify";

import Loader from "../../components/common/Loader";
import { getRestaurants } from "../../redux/actions/restaurantAction";
import { myOrders } from "../../redux/actions/orderActions";
import { clearErrors } from "../../redux/slices/orderSlice";

const ListOrders = () => {
  const dispatch = useDispatch();
  const { loading, error, orders } = useSelector((state) => state.order);

  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [sortField, setSortField] = useState("createdAt");
  const [sortDirection, setSortDirection] = useState("desc");
  const rowsPerPage = 10;

  useEffect(() => {
    dispatch(myOrders());
    dispatch(getRestaurants());
    const refreshTimer = setInterval(() => dispatch(myOrders()), 30000);
    return () => clearInterval(refreshTimer);
  }, [dispatch]);

  useEffect(() => {
    if (error) {
      toast.error(error, { position: "bottom-right" });
      dispatch(clearErrors());
    }
  }, [error, dispatch]);

  const rawData = useMemo(() => {
    return (
      orders?.map((order) => ({
        id: order._id,
        restaurant: order.restaurant?.name || "Unknown Restaurant",
        itemsCount: order.orderItems?.length || 0,
        amountNum: order.finalTotal || 0,
        amount: `₹${order.finalTotal || 0}`,
        status: order.orderStatus || "Processing",
        adminMessage: order.adminMessage,
        createdAt: order.createdAt,
        date: new Date(order.createdAt).toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
          year: "numeric",
        }),
      })) || []
    );
  }, [orders]);

  const filteredData = useMemo(() => {
    if (!searchQuery.trim()) return rawData;
    const q = searchQuery.toLowerCase();
    return rawData.filter(
      (row) =>
        row.restaurant.toLowerCase().includes(q) ||
        row.status.toLowerCase().includes(q) ||
        row.date.toLowerCase().includes(q) ||
        String(row.amountNum).includes(q)
    );
  }, [rawData, searchQuery]);

  const sortedData = useMemo(() => {
    const list = [...filteredData];
    list.sort((a, b) => {
      let valA = a[sortField];
      let valB = b[sortField];
      if (typeof valA === "string") valA = valA.toLowerCase();
      if (typeof valB === "string") valB = valB.toLowerCase();
      if (valA < valB) return sortDirection === "asc" ? -1 : 1;
      if (valA > valB) return sortDirection === "asc" ? 1 : -1;
      return 0;
    });
    return list;
  }, [filteredData, sortField, sortDirection]);

  const totalPages = Math.ceil(sortedData.length / rowsPerPage) || 1;
  const paginatedData = useMemo(() => {
    const start = (currentPage - 1) * rowsPerPage;
    return sortedData.slice(start, start + rowsPerPage);
  }, [sortedData, currentPage, rowsPerPage]);

  const handleSort = (field) => {
    if (sortField === field) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDirection("asc");
    }
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 space-y-6">
      <div className="border-b border-slate-200/80 pb-5 flex flex-col md:flex-row md:items-end md:justify-between gap-4">
        <div>
          <span className="text-xs font-bold uppercase tracking-wider text-emerald-700">Purchase History</span>
          <h1 className="font-display text-3xl font-extrabold text-slate-900 sm:text-4xl">My Orders</h1>
          <p className="mt-1 text-sm text-slate-500">Track current deliveries and review past gourmet orders</p>
        </div>
        {rawData.length > 0 && (
          <div className="w-full md:w-72">
            <input
              type="text"
              placeholder="Search orders..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs text-slate-700 shadow-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
            />
          </div>
        )}
      </div>

      {loading ? (
        <Loader />
      ) : rawData.length === 0 ? (
        <div className="rounded-3xl border border-slate-200/80 bg-white p-12 text-center shadow-sm">
          <p className="text-4xl mb-3">📦</p>
          <h3 className="text-xl font-bold text-slate-900">No Orders Found</h3>
          <p className="mt-1 text-sm text-slate-500">When you place an order, it will appear right here.</p>
          <Link
            to="/"
            className="mt-6 inline-flex rounded-2xl bg-emerald-600 px-5 py-3 text-xs font-bold text-white shadow-md hover:bg-emerald-700 transition active:scale-95"
          >
            Order Now
          </Link>
        </div>
      ) : (
        <div className="overflow-hidden rounded-3xl border border-slate-200/80 bg-white/95 shadow-xl backdrop-blur-xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-600">
              <thead className="bg-slate-50/80 text-xs font-extrabold uppercase tracking-wider text-slate-500 border-b border-slate-200">
                <tr>
                  <th
                    onClick={() => handleSort("restaurant")}
                    className="cursor-pointer px-6 py-4 transition hover:text-slate-900 select-none"
                  >
                    Restaurant {sortField === "restaurant" && (sortDirection === "asc" ? "▲" : "▼")}
                  </th>
                  <th
                    onClick={() => handleSort("itemsCount")}
                    className="cursor-pointer px-6 py-4 transition hover:text-slate-900 select-none"
                  >
                    Items {sortField === "itemsCount" && (sortDirection === "asc" ? "▲" : "▼")}
                  </th>
                  <th
                    onClick={() => handleSort("amountNum")}
                    className="cursor-pointer px-6 py-4 transition hover:text-slate-900 select-none"
                  >
                    Amount {sortField === "amountNum" && (sortDirection === "asc" ? "▲" : "▼")}
                  </th>
                  <th
                    onClick={() => handleSort("status")}
                    className="cursor-pointer px-6 py-4 transition hover:text-slate-900 select-none"
                  >
                    Status {sortField === "status" && (sortDirection === "asc" ? "▲" : "▼")}
                  </th>
                  <th
                    onClick={() => handleSort("createdAt")}
                    className="cursor-pointer px-6 py-4 transition hover:text-slate-900 select-none"
                  >
                    Date {sortField === "createdAt" && (sortDirection === "asc" ? "▲" : "▼")}
                  </th>
                  <th className="px-6 py-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {paginatedData.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-10 text-center text-slate-400">
                      No matching orders found.
                    </td>
                  </tr>
                ) : (
                  paginatedData.map((row) => {
                    const statusStr = (row.status || "").toLowerCase();
                    const isDelivered = statusStr.includes("delivered");
                    const isProcessing = statusStr.includes("processing") || statusStr.includes("preparing");

                    return (
                      <tr key={row.id} className="transition hover:bg-emerald-50/50">
                        <td className="px-6 py-4 font-bold text-slate-900 flex items-center gap-2">
                          <span className="text-base">🏪</span> {row.restaurant}
                        </td>
                        <td className="px-6 py-4">
                          <span className="font-semibold text-slate-600 bg-slate-100 px-2.5 py-1 rounded-lg text-xs">
                            {row.itemsCount} {row.itemsCount === 1 ? "Item" : "Items"}
                          </span>
                        </td>
                        <td className="px-6 py-4 font-display font-black text-slate-900 text-sm">
                          {row.amount}
                        </td>
                        <td className="px-6 py-4">
                          <div className="space-y-1 py-1">
                            <span
                              className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold ${
                                isDelivered
                                  ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                                  : isProcessing
                                  ? "bg-amber-50 text-amber-800 border border-amber-200"
                                  : "bg-rose-50 text-rose-700 border border-rose-200"
                              }`}
                            >
                              <span
                                className={`h-1.5 w-1.5 rounded-full ${
                                  isDelivered
                                    ? "bg-emerald-500"
                                    : isProcessing
                                    ? "bg-amber-500 animate-pulse"
                                    : "bg-rose-500"
                                }`}
                              />
                              {row.status}
                            </span>
                            {row.adminMessage && (
                              <p className="max-w-52 text-xs text-slate-500">{row.adminMessage}</p>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4 text-xs text-slate-500 font-medium">{row.date}</td>
                        <td className="px-6 py-4 text-right">
                          <Link
                            to={`/eats/orders/${row.id}`}
                            className="inline-flex rounded-xl bg-slate-900 px-3.5 py-1.5 text-xs font-bold text-white transition hover:bg-emerald-600 active:scale-95 shadow-sm"
                          >
                            View Details
                          </Link>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {totalPages > 1 && (
            <div className="flex items-center justify-between border-t border-slate-200 bg-slate-50/60 px-6 py-3">
              <span className="text-xs text-slate-500">
                Showing Page <span className="font-bold text-slate-700">{currentPage}</span> of{" "}
                <span className="font-bold text-slate-700">{totalPages}</span> ({filteredData.length} total orders)
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-700 transition hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  Previous
                </button>
                <button
                  type="button"
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-700 transition hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default ListOrders;
