import React, { useEffect } from "react";
import { Link } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { toast } from "react-toastify";
import DataTableModule from "react-data-table-component";

const DataTable = DataTableModule.default || DataTableModule;

import Loader from "../layout/Loader";
import { getRestaurants } from "../../redux/actions/restaurantAction";
import { myOrders } from "../../redux/actions/orderActions";
import { clearErrors } from "../../redux/slices/orderSlice";

import "./ListOrders.css";

const ListOrders = () => {
  const dispatch = useDispatch();

  const { loading, error, orders } = useSelector((state) => state.order);

  useEffect(() => {
    dispatch(myOrders());
    dispatch(getRestaurants());
  }, [dispatch]);

  useEffect(() => {
    if (error) {
      toast.error(error, { position: "bottom-right" });
      dispatch(clearErrors());
    }
  }, [error, dispatch]);

  const columns = [
    {
      name: "Restaurant",
      selector: (row) => row.restaurant,
      sortable: true,
      cell: (row) => (
        <span className="font-bold text-slate-900 flex items-center gap-2">
          <span className="text-base">🏪</span> {row.restaurant}
        </span>
      ),
    },
    {
      name: "Items",
      selector: (row) => row.items,
      sortable: true,
      cell: (row) => (
        <span className="font-semibold text-slate-600 bg-slate-100 px-2.5 py-1 rounded-lg text-xs">
          {row.items} {row.items === 1 ? "Item" : "Items"}
        </span>
      ),
    },
    {
      name: "Amount",
      selector: (row) => row.amountNum,
      sortable: true,
      cell: (row) => (
        <span className="font-display font-black text-slate-900 text-sm">
          {row.amount}
        </span>
      ),
    },
    {
      name: "Status",
      cell: (row) => {
        const isDelivered = row.status.toLowerCase().includes("delivered");
        const isProcessing = row.status.toLowerCase().includes("processing") || row.status.toLowerCase().includes("preparing");
        return (
          <span
            className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold ${
              isDelivered
                ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                : isProcessing
                ? "bg-amber-50 text-amber-800 border border-amber-200"
                : "bg-rose-50 text-rose-700 border border-rose-200"
            }`}
          >
            <span className={`h-1.5 w-1.5 rounded-full ${isDelivered ? "bg-emerald-500" : isProcessing ? "bg-amber-500 animate-pulse" : "bg-rose-500"}`} />
            {row.status}
          </span>
        );
      },
      sortable: true,
    },
    {
      name: "Date",
      selector: (row) => row.date,
      sortable: true,
      cell: (row) => <span className="text-xs text-slate-500 font-medium">{row.date}</span>,
    },
    {
      name: "Action",
      cell: (row) => (
        <Link
          to={`/eats/orders/${row.id}`}
          className="rounded-xl bg-slate-900 px-3.5 py-1.5 text-xs font-bold text-white transition hover:bg-emerald-600 active:scale-95 shadow-sm"
        >
          View Details
        </Link>
      ),
    },
  ];

  const data =
    orders?.map((order) => ({
      id: order._id,
      restaurant: order.restaurant?.name || "Unknown Restaurant",
      items: order.orderItems.length,
      amountNum: order.finalTotal,
      amount: `₹${order.finalTotal}`,
      status: order.orderStatus,
      date: new Date(order.createdAt).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      }),
    })) || [];

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 space-y-6">
      <div className="border-b border-slate-200/80 pb-5">
        <span className="text-xs font-bold uppercase tracking-wider text-emerald-700">Purchase History</span>
        <h1 className="font-display text-3xl font-extrabold text-slate-900 sm:text-4xl">My Orders</h1>
        <p className="mt-1 text-sm text-slate-500">Track current deliveries and review past gourmet orders</p>
      </div>

      {loading ? (
        <Loader />
      ) : data.length === 0 ? (
        <div className="rounded-3xl border border-slate-200/80 bg-white p-12 text-center shadow-sm">
          <p className="text-4xl mb-3">📦</p>
          <h3 className="text-xl font-bold text-slate-900">No Orders Found</h3>
          <p className="mt-1 text-sm text-slate-500">When you place an order, it will appear right here.</p>
          <Link
            to="/"
            className="mt-6 inline-flex rounded-2xl bg-emerald-600 px-5 py-3 text-xs font-bold text-white shadow-md hover:bg-emerald-700"
          >
            Order Now
          </Link>
        </div>
      ) : (
        <div className="overflow-hidden rounded-3xl border border-slate-200/80 bg-white/95 shadow-xl backdrop-blur-xl p-2">
          <DataTable
            columns={columns}
            data={data}
            pagination
            highlightOnHover
            responsive
            customStyles={customStyles}
          />
        </div>
      )}
    </div>
  );
};

const customStyles = {
  header: {
    style: {
      minHeight: "56px",
    },
  },
  headRow: {
    style: {
      backgroundColor: "#f8fafc",
      borderBottomColor: "#e2e8f0",
      borderTopLeftRadius: "1rem",
      borderTopRightRadius: "1rem",
    },
  },
  headCells: {
    style: {
      fontWeight: "800",
      fontSize: "12px",
      textTransform: "uppercase",
      letterSpacing: "0.05em",
      color: "#475569",
    },
  },
  rows: {
    style: {
      fontSize: "14px",
      minHeight: "64px",
      "&:hover": {
        backgroundColor: "#f0fdf4 !important",
      },
    },
  },
};

export default ListOrders;