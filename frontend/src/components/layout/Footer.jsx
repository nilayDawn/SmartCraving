import React from "react";
import { useSelector } from "react-redux";
import { Link } from "react-router-dom";

const Footer = () => {
  const user = useSelector((state) => state.user.user);
  return (
    <footer className="mt-16 border-t border-slate-200/80 bg-white/80 backdrop-blur-xl">
      <div className="mx-auto max-w-7xl px-6 py-10 sm:px-8">
        <div className="flex flex-col items-center justify-between gap-6 sm:flex-row">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-xl bg-white shadow-md shadow-emerald-600/20">
              <img src="/images/logo.png" alt="SmartCraving logo" className="h-full w-full object-contain p-1" />
            </div>
            <div>
              <span className="font-display text-lg font-black tracking-tight text-slate-900">
                Smart<span className="text-emerald-600">Craving</span>
              </span>
              <p className="text-xs text-slate-500">Fresh food & gourmet meals delivered to your doorstep.</p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-6 text-xs font-semibold text-slate-600">
            <Link to="/" className="transition hover:text-emerald-700">Home</Link>
            {user?.role !== "admin" && <Link to="/cart" className="transition hover:text-emerald-700">Cart</Link>}
            <Link to={user?.role === "admin" ? "/admin/orders" : "/eats/orders/me/myOrders"} className="transition hover:text-emerald-700">Orders</Link>
            <Link to="/users/me" className="transition hover:text-emerald-700">Profile</Link>
          </div>
        </div>

        <div className="mt-8 border-t border-slate-100 pt-6 text-center text-xs font-medium text-slate-400">
          <p>© {new Date().getFullYear()} SmartCraving Inc. All rights reserved. Crafted with care for food lovers everywhere.</p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
