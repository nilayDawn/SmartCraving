import React from "react";
import { Link } from "react-router-dom";

const Landing = () => {
  return (
    <div className="space-y-12 pb-16">
      {/* Hero Section */}
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-slate-950 via-slate-900 to-emerald-950 px-6 py-16 text-white shadow-2xl sm:px-12 sm:py-24">
        <div className="absolute -right-20 -top-20 h-96 w-96 rounded-full bg-emerald-500/10 blur-3xl" />
        <div className="absolute -bottom-20 -left-20 h-96 w-96 rounded-full bg-amber-500/10 blur-3xl" />

        <div className="relative z-10 max-w-3xl space-y-6">
          <div className="inline-flex items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-4 py-1.5 backdrop-blur-md">
            <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-300">
              Gourmet Culinary Platform
            </span>
          </div>

          <h1 className="font-display text-4xl font-extrabold tracking-tight text-white sm:text-6xl sm:leading-tight">
            Curated Dining, <span className="bg-gradient-to-r from-emerald-400 via-teal-300 to-amber-300 bg-clip-text text-transparent">Delivered Fresh.</span>
          </h1>

          <p className="max-w-2xl text-base text-slate-300 leading-relaxed sm:text-lg">
            Discover top-rated local kitchens, explore chef-crafted menus, and experience gourmet dining with transparent AI guest insights.
          </p>

          <div className="pt-4 flex flex-wrap items-center gap-4">
            <Link
              to="/restaurants"
              className="inline-flex items-center gap-2.5 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 px-8 py-4 font-display text-base font-bold text-white shadow-xl shadow-emerald-600/30 transition hover:from-emerald-700 hover:to-teal-700 active:scale-95"
            >
              <span>🍽️ Explore Restaurants</span>
              <span>→</span>
            </Link>
          </div>
        </div>
      </section>

      {/* Feature Highlights Grid */}
      <section className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-3xl border border-slate-200/80 bg-white/95 p-6 shadow-sm backdrop-blur-xl space-y-2">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600 text-xl font-bold">
            🌟
          </div>
          <h3 className="font-display text-lg font-bold text-slate-900">AI Sentiment Summaries</h3>
          <p className="text-xs leading-relaxed text-slate-500">
            Real-time machine learning summaries analyze verified guest reviews to highlight top dishes.
          </p>
        </div>

        <div className="rounded-3xl border border-slate-200/80 bg-white/95 p-6 shadow-sm backdrop-blur-xl space-y-2">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600 text-xl font-bold">
            🌱
          </div>
          <h3 className="font-display text-lg font-bold text-slate-900">Pure Veg Options</h3>
          <p className="text-xs leading-relaxed text-slate-500">
            Single-click toggle filters for 100% vegetarian kitchens and dietary preferences instantly.
          </p>
        </div>

        <div className="rounded-3xl border border-slate-200/80 bg-white/95 p-6 shadow-sm backdrop-blur-xl space-y-2">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600 text-xl font-bold">
            🍳
          </div>
          <h3 className="font-display text-lg font-bold text-slate-900">Fresh Kitchen Dispatch</h3>
          <p className="text-xs leading-relaxed text-slate-500">
            Meals are prepared fresh to order and dispatched immediately upon kitchen completion.
          </p>
        </div>

        <div className="rounded-3xl border border-slate-200/80 bg-white/95 p-6 shadow-sm backdrop-blur-xl space-y-2">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600 text-xl font-bold">
            💳
          </div>
          <h3 className="font-display text-lg font-bold text-slate-900">Secure Stripe Checkout</h3>
          <p className="text-xs leading-relaxed text-slate-500">
            Encrypted checkout with Stripe guarantees safe credit card transactions.
          </p>
        </div>
      </section>

      {/* Call to Action Section */}
      <section className="rounded-3xl bg-gradient-to-r from-emerald-900 via-teal-900 to-slate-900 p-8 sm:p-12 text-center text-white shadow-xl space-y-5">
        <h2 className="font-display text-3xl font-extrabold sm:text-4xl">
          Ready to Explore Top Kitchens?
        </h2>
        <p className="max-w-xl mx-auto text-xs sm:text-sm text-slate-300 leading-relaxed">
          Browse chef-crafted menus, read verified AI review insights, and order your favorite dishes.
        </p>
        <div className="pt-2">
          <Link
            to="/restaurants"
            className="inline-flex items-center gap-2.5 rounded-2xl bg-white px-8 py-4 font-display text-base font-bold text-slate-900 shadow-xl transition hover:bg-emerald-50 active:scale-95"
          >
            <span>Explore Now</span>
            <span>→</span>
          </Link>
        </div>
      </section>
    </div>
  );
};

export default Landing;
