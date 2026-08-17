import React, { useEffect, useRef, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Link, useNavigate } from "react-router-dom";
import { logout } from "../../redux/actions/userActions";
import { toast } from "react-toastify";
import Search from "./Search";

const Header = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const { user, isAuthenticated, loading } = useSelector((state) => state.user);
  const { cartItems } = useSelector((state) => state.cart);
  const [profileOpen, setProfileOpen] = useState(false);
  const profileMenuRef = useRef(null);

  useEffect(() => {
    const closeMenu = (event) => {
      if (!profileMenuRef.current?.contains(event.target)) {
        setProfileOpen(false);
      }
    };
    const closeOnEscape = (event) => {
      if (event.key === "Escape") {
        setProfileOpen(false);
      }
    };

    document.addEventListener("mousedown", closeMenu);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("mousedown", closeMenu);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, []);

  const logoutHandler = () => {
    dispatch(logout());
    toast.success("Logged out successfully");
  };

  return (
    <header className="sticky top-0 z-50 border-b border-slate-200/80 bg-white/80 shadow-sm backdrop-blur-xl">
      <div className="mx-auto flex h-20 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
        {/* Logo */}
        <div className="shrink-0">
          <Link to="/" className="group flex items-center gap-2">
            <div className="flex h-11 w-11 items-center justify-center overflow-hidden rounded-2xl bg-white shadow-lg shadow-emerald-600/20 transition-transform duration-300 group-hover:scale-105">
              <img src="/images/logo.png" alt="SmartCraving logo" className="h-full w-full object-contain p-1" />
            </div>
            <div className="flex flex-col">
              <span className="font-display text-2xl font-black tracking-tight text-slate-900">
                Smart<span className="text-emerald-600">Craving</span>
              </span>
              <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-700">Gourmet Delivery</span>
            </div>
          </Link>
        </div>

        {/* Search */}
        <div className="min-w-0 max-w-lg flex-1 px-2">
          <Search />
        </div>

        {/* Right Side Controls */}
        <div className="flex items-center gap-2 sm:gap-3">
          <Link
            to="/restaurants"
            className="inline-flex items-center gap-1.5 rounded-2xl border border-slate-200/80 bg-slate-50/80 px-3 py-2 text-xs font-bold text-slate-700 transition duration-200 hover:border-emerald-300 hover:bg-emerald-50/50 hover:text-emerald-700 sm:px-3.5 sm:py-2.5"
          >
            <span>🍽️</span> Restaurants
          </Link>

          {user?.role === "admin" && (
            <Link
              to="/admin/dashboard"
              className="inline-flex items-center gap-1.5 rounded-2xl border border-amber-300/80 bg-amber-50 px-3 py-2 text-xs font-extrabold text-amber-900 shadow-sm transition duration-200 hover:bg-amber-100 hover:border-amber-400 sm:px-3.5 sm:py-2.5"
            >
              <span>👑</span> Admin Panel
            </Link>
          )}

          <Link
            to="/cart"
            aria-label="Shopping cart"
            className="group relative flex items-center gap-2 rounded-2xl border border-slate-200/80 bg-slate-50/80 px-4 py-2.5 text-sm font-semibold text-slate-700 transition duration-200 hover:border-emerald-300 hover:bg-emerald-50/50 hover:text-emerald-700 hover:shadow-sm"
          >
            <span aria-hidden="true" className="text-lg transition-transform duration-200 group-hover:scale-110">
              🛍️
            </span>
            <span className="hidden font-medium sm:inline">Cart</span>
            {cartItems.length > 0 ? (
              <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-emerald-600 px-1.5 text-xs font-bold text-white shadow-sm shadow-emerald-600/40">
                {cartItems.length}
              </span>
            ) : (
              <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-slate-200 text-xs font-bold text-slate-600">
                0
              </span>
            )}
          </Link>

          {user ? (
            <div ref={profileMenuRef} className="relative">
              <button
                type="button"
                aria-expanded={profileOpen}
                aria-haspopup="menu"
                onClick={() => setProfileOpen((isOpen) => !isOpen)}
                className="flex items-center gap-3 rounded-2xl border border-slate-200/80 bg-slate-50/80 p-1.5 pr-3 text-sm font-semibold text-slate-700 transition duration-200 hover:border-emerald-300 hover:bg-emerald-50/50 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
              >
                <img
                  src={user?.avatar?.url || "/images/images.png"}
                  alt={user?.name}
                  className="h-9 w-9 rounded-xl object-cover ring-2 ring-emerald-500/20 shadow-sm"
                />

                <div className="hidden text-left sm:block">
                  <span className="block text-xs font-bold text-slate-900">{user?.name}</span>
                  <span className="block text-[10px] font-semibold text-emerald-700 uppercase tracking-wider">
                    {user?.role || "Member"}
                  </span>
                </div>

                <span
                  className={`text-xs text-slate-400 transition-transform duration-200 ${
                    profileOpen ? "rotate-180 text-emerald-600" : ""
                  }`}
                  aria-hidden="true"
                >
                  ▼
                </span>
              </button>

              {profileOpen && (
                <div
                  role="menu"
                  className="absolute right-0 top-full z-50 mt-3 w-56 rounded-3xl border border-slate-100 bg-white/95 p-2 text-sm shadow-2xl backdrop-blur-xl ring-1 ring-slate-900/5 animate-in fade-in slide-in-from-top-2 duration-200"
                >
                  <div className="border-b border-slate-100 px-3 py-2 sm:hidden">
                    <p className="font-bold text-slate-900">{user?.name}</p>
                    <p className="text-xs text-slate-500">{user?.email}</p>
                  </div>

                  {user?.role === "admin" && (
                    <Link
                      className="flex items-center gap-2.5 rounded-2xl px-3.5 py-2.5 font-bold text-amber-900 bg-amber-50/80 hover:bg-amber-100 transition"
                      to="/admin/dashboard"
                      onClick={() => setProfileOpen(false)}
                    >
                      <span>👑</span> Admin Dashboard
                    </Link>
                  )}

                  <Link
                    className="flex items-center gap-2.5 rounded-2xl px-3.5 py-2.5 font-medium text-slate-700 transition hover:bg-emerald-50 hover:text-emerald-700"
                    to="/eats/orders/me/myOrders"
                    onClick={() => setProfileOpen(false)}
                  >
                    <span>📦</span> My Orders
                  </Link>

                  <Link
                    className="flex items-center gap-2.5 rounded-2xl px-3.5 py-2.5 font-medium text-slate-700 transition hover:bg-emerald-50 hover:text-emerald-700"
                    to="/users/me"
                    onClick={() => setProfileOpen(false)}
                  >
                    <span>👤</span> View Profile
                  </Link>

                  <div className="my-1 h-px bg-slate-100" />

                  <Link
                    className="flex items-center gap-2.5 rounded-2xl px-3.5 py-2.5 font-medium text-rose-600 transition hover:bg-rose-50 hover:text-rose-700"
                    to="/"
                    onClick={() => {
                      setProfileOpen(false);
                      logoutHandler();
                    }}
                  >
                    <span>🚪</span> Sign Out
                  </Link>
                </div>
              )}
            </div>
          ) : (
            !loading && (
              <Link
                to="/users/login"
                className="rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 px-5 py-2.5 font-display text-sm font-bold text-white shadow-md shadow-emerald-600/20 transition duration-200 hover:-translate-y-0.5 hover:from-emerald-700 hover:to-teal-700 hover:shadow-lg hover:shadow-emerald-600/30 active:scale-[0.98]"
              >
                Sign In
              </Link>
            )
          )}
        </div>
      </div>
    </header>
  );
};

export default Header;
