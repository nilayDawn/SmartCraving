import React, { useEffect } from "react";
import { useSelector, useDispatch } from "react-redux";
import { getRestaurants } from "../redux/actions/restaurantAction";

const CountRestaurant = () => {
  const dispatch = useDispatch();

  const { count, pureVegRestaurantsCount, showVegOnly, loading, error } =
    useSelector((state) => state.restaurants);

  useEffect(() => {
    dispatch(getRestaurants());
  }, [dispatch, showVegOnly]);

  return (
    <div className="mb-6 flex flex-wrap items-center justify-between gap-4 border-b border-slate-200/80 pb-5">
      {loading ? (
        <div className="flex items-center gap-2 text-sm text-slate-500">
          <div className="h-4 w-4 animate-spin rounded-full border-2 border-emerald-600 border-t-transparent"></div>
          <span>Discovering restaurants near you...</span>
        </div>
      ) : error ? (
        <p className="text-sm font-semibold text-rose-600">Error: {error}</p>
      ) : (
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-700 font-bold shadow-inner">
            🏪
          </div>
          <div>
            <div className="flex items-baseline gap-2">
              <span className="font-display text-2xl font-black tracking-tight text-slate-900">
                {showVegOnly ? pureVegRestaurantsCount : count}
              </span>
              <span className="text-sm font-semibold text-slate-500">
                {showVegOnly
                  ? pureVegRestaurantsCount === 1
                    ? "Pure Veg Restaurant Available"
                    : "Pure Veg Restaurants Available"
                  : count === 1
                  ? "Restaurant Nearby"
                  : "Restaurants Nearby"}
              </span>
            </div>
            <p className="text-xs font-medium text-slate-400">Handpicked partners ready for express delivery</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default CountRestaurant;
