import React, { useEffect } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { logout } from "../../redux/actions/userActions";
import { toast } from "react-toastify";
import Search from "./Search";

const Sidebar = ({ isOpen, onClose }) => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const location = useLocation();

  const { user } = useSelector((state) => state.user);
  const { cartItems } = useSelector((state) => state.cart);
  const isAdmin = user?.role === "admin";

  // Prevent background scrolling when sidebar is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }
    return () => {
      document.body.style.overflow = "unset";
    };
  }, [isOpen]);

  // Close sidebar on Escape key
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  const handleLogout = () => {
    dispatch(logout());
    toast.success("Logged out successfully");
    onClose();
    navigate("/");
  };

  const isActive = (path) => location.pathname === path;

  return (
    <>
      {/* Backdrop */}
      <div
        className={`fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs transition-opacity duration-300 ${
          isOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
        }`}
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Drawer Panel */}
      <aside
        className={`fixed top-0 left-0 z-50 h-full w-[280px] max-w-[85vw] bg-white/95 backdrop-blur-xl shadow-2xl transition-transform duration-300 ease-in-out border-r border-slate-200/80 flex flex-col justify-between ${
          isOpen ? "translate-x-0" : "-translate-x-full"
        }`}
        aria-label="Mobile Navigation Sidebar"
      >
        {/* Top Header */}
        <div className="p-5 border-b border-slate-100">
          <div className="flex items-center justify-between mb-4">
            <Link to="/" onClick={onClose} className="flex items-center gap-2.5">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white shadow-md shadow-emerald-600/10">
                <img src="/images/logo.png" alt="SmartCraving logo" className="h-full w-full object-contain p-1" />
              </div>
              <div className="flex flex-col">
                <span className="font-display text-xl font-black tracking-tight text-slate-900">
                  Smart<span className="text-emerald-600">Craving</span>
                </span>
                <span className="text-[9px] font-bold uppercase tracking-wider text-emerald-700">
                  Gourmet Delivery
                </span>
              </div>
            </Link>
            <button
              onClick={onClose}
              type="button"
              className="rounded-xl p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition"
              aria-label="Close sidebar"
            >
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* User Info Card or Sign In Banner */}
          {user ? (
            <div className="flex items-center gap-3 p-3 rounded-2xl bg-emerald-50/60 border border-emerald-100">
              <img
                src={user?.avatar?.url || "/images/images.png"}
                alt={user?.name}
                className="h-11 w-11 rounded-xl object-cover ring-2 ring-emerald-500/30 shadow-sm"
              />
              <div className="min-w-0 flex-1">
                <p className="font-bold text-sm text-slate-900 truncate">{user?.name}</p>
                <p className="text-xs text-slate-500 truncate">{user?.email}</p>
                <span className="inline-block mt-0.5 px-2 py-0.5 text-[9px] font-extrabold uppercase tracking-wider rounded-md bg-emerald-600 text-white shadow-xs">
                  {user?.role || "Member"}
                </span>
              </div>
            </div>
          ) : (
            <div className="p-3.5 rounded-2xl bg-linear-to-r from-emerald-50 to-teal-50 border border-emerald-100 text-center">
              <p className="text-xs font-semibold text-slate-700 mb-2.5">
                Sign in to manage orders & save your favorites!
              </p>
              <Link
                to="/users/login"
                onClick={onClose}
                className="inline-block w-full py-2 px-4 rounded-xl bg-emerald-600 text-white font-bold text-xs shadow-md shadow-emerald-600/20 hover:bg-emerald-700 transition"
              >
                Sign In / Register
              </Link>
            </div>
          )}
        </div>

        {/* Search Bar in Sidebar */}
        <div className="px-4 py-3 border-b border-slate-100">
          <Search />
        </div>

        {/* Scrollable Navigation Links */}
        <div className="flex-1 overflow-y-auto p-4 space-y-1.5">
          <p className="px-3 text-[10px] font-extrabold uppercase tracking-wider text-slate-400 mb-1">
            Menu Navigation
          </p>

          <Link
            to="/"
            onClick={onClose}
            className={`flex items-center gap-3 px-3.5 py-2.5 rounded-2xl text-sm font-semibold transition ${
              isActive("/")
                ? "bg-emerald-600 text-white shadow-md shadow-emerald-600/20"
                : "text-slate-700 hover:bg-slate-100"
            }`}
          >
            <span className="text-base">🏠</span>
            <span>Home</span>
          </Link>

          <Link
            to="/restaurants"
            onClick={onClose}
            className={`flex items-center gap-3 px-3.5 py-2.5 rounded-2xl text-sm font-semibold transition ${
              isActive("/restaurants")
                ? "bg-emerald-600 text-white shadow-md shadow-emerald-600/20"
                : "text-slate-700 hover:bg-slate-100"
            }`}
          >
            <span className="text-base">🍽️</span>
            <span>Restaurants</span>
          </Link>

          <Link
            to="/cart"
            onClick={onClose}
            className={`flex items-center justify-between px-3.5 py-2.5 rounded-2xl text-sm font-semibold transition ${
              isActive("/cart")
                ? "bg-emerald-600 text-white shadow-md shadow-emerald-600/20"
                : "text-slate-700 hover:bg-slate-100"
            }`}
          >
            <div className="flex items-center gap-3">
              <span className="text-base">🛍️</span>
              <span>My Cart</span>
            </div>
            <span
              className={`px-2 py-0.5 text-xs font-bold rounded-full ${
                isActive("/cart")
                  ? "bg-white text-emerald-700"
                  : cartItems.length > 0
                  ? "bg-emerald-600 text-white"
                  : "bg-slate-200 text-slate-600"
              }`}
            >
              {cartItems.length}
            </span>
          </Link>

          {user && (
            <>
              <div className="pt-3 pb-1">
                <p className="px-3 text-[10px] font-extrabold uppercase tracking-wider text-slate-400">
                  User Account
                </p>
              </div>

              <Link
                to={isAdmin ? "/admin/orders" : "/eats/orders/me/myOrders"}
                onClick={onClose}
                className={`flex items-center gap-3 px-3.5 py-2.5 rounded-2xl text-sm font-semibold transition ${
                  isActive(isAdmin ? "/admin/orders" : "/eats/orders/me/myOrders")
                    ? "bg-emerald-600 text-white shadow-md shadow-emerald-600/20"
                    : "text-slate-700 hover:bg-slate-100"
                }`}
              >
                <span className="text-base">📦</span>
                <span>{isAdmin ? "Restaurant Orders" : "My Orders"}</span>
              </Link>

              <Link
                to="/users/me"
                onClick={onClose}
                className={`flex items-center gap-3 px-3.5 py-2.5 rounded-2xl text-sm font-semibold transition ${
                  isActive("/users/me")
                    ? "bg-emerald-600 text-white shadow-md shadow-emerald-600/20"
                    : "text-slate-700 hover:bg-slate-100"
                }`}
              >
                <span className="text-base">👤</span>
                <span>View Profile</span>
              </Link>
            </>
          )}

          {isAdmin && (
            <>
              <div className="pt-3 pb-1">
                <p className="px-3 text-[10px] font-extrabold uppercase tracking-wider text-amber-600">
                  Admin Panel
                </p>
              </div>

              <Link
                to="/admin/dashboard"
                onClick={onClose}
                className={`flex items-center gap-3 px-3.5 py-2.5 rounded-2xl text-sm font-semibold transition ${
                  isActive("/admin/dashboard")
                    ? "bg-amber-600 text-white shadow-md shadow-amber-600/20"
                    : "text-slate-700 hover:bg-amber-50 hover:text-amber-800"
                }`}
              >
                <span className="text-base">📊</span>
                <span>Dashboard</span>
              </Link>

              <Link
                to="/admin/coupons"
                onClick={onClose}
                className={`flex items-center gap-3 px-3.5 py-2.5 rounded-2xl text-sm font-semibold transition ${
                  isActive("/admin/coupons")
                    ? "bg-amber-600 text-white shadow-md shadow-amber-600/20"
                    : "text-slate-700 hover:bg-amber-50 hover:text-amber-800"
                }`}
              >
                <span className="text-base">🎟️</span>
                <span>Manage Coupons</span>
              </Link>

              <Link
                to="/admin/restaurants/new"
                onClick={onClose}
                className={`flex items-center gap-3 px-3.5 py-2.5 rounded-2xl text-sm font-semibold transition ${
                  isActive("/admin/restaurants/new")
                    ? "bg-amber-600 text-white shadow-md shadow-amber-600/20"
                    : "text-slate-700 hover:bg-amber-50 hover:text-amber-800"
                }`}
              >
                <span className="text-base">➕</span>
                <span>Add Restaurant</span>
              </Link>

              <Link
                to="/admin/items/new"
                onClick={onClose}
                className={`flex items-center gap-3 px-3.5 py-2.5 rounded-2xl text-sm font-semibold transition ${
                  isActive("/admin/items/new")
                    ? "bg-amber-600 text-white shadow-md shadow-amber-600/20"
                    : "text-slate-700 hover:bg-amber-50 hover:text-amber-800"
                }`}
              >
                <span className="text-base">🍔</span>
                <span>Add Food Item</span>
              </Link>
            </>
          )}
        </div>

        {/* Footer Area with Logout / Login */}
        <div className="p-4 border-t border-slate-100 bg-slate-50/50">
          {user ? (
            <button
              onClick={handleLogout}
              type="button"
              className="flex w-full items-center justify-center gap-2 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-2.5 font-bold text-sm text-rose-600 hover:bg-rose-100 hover:text-rose-700 transition"
            >
              <span>🚪</span>
              <span>Sign Out</span>
            </button>
          ) : (
            <Link
              to="/users/login"
              onClick={onClose}
              className="flex w-full items-center justify-center gap-2 rounded-2xl bg-emerald-600 px-4 py-2.5 font-bold text-sm text-white shadow-md shadow-emerald-600/20 hover:bg-emerald-700 transition"
            >
              <span>🔑</span>
              <span>Sign In / Register</span>
            </Link>
          )}
        </div>
      </aside>
    </>
  );
};

export default Sidebar;
