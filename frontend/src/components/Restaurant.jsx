import React, { useState } from "react";
import { Link } from "react-router-dom";
import { useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { deleteRestaurant } from "../redux/actions/restaurantAction";
import api from "../utils/api";

const Restaurant = ({ restaurant }) => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const [showAI, setShowAI] = useState(false);
  const [aiSummary, setAiSummary] = useState({
    sentiment: restaurant.reviewSentiment,
    summaryBullets: restaurant.reviewSummaryBullets || [],
    topMentions: restaurant.reviewTopMentions || [],
  });
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState("");
  const [showReviews, setShowReviews] = useState(false);
  const [showReviewForm, setShowReviewForm] = useState(false);
  const [reviews, setReviews] = useState(restaurant.reviews || []);
  const [reviewForm, setReviewForm] = useState({ name: "", rating: 5, Comment: "" });
  const [reviewSubmitting, setReviewSubmitting] = useState(false);
  const [reviewError, setReviewError] = useState("");

  const { isAuthenticated, user } = useSelector(
    (state) => state.user || {}
  );

  const handleDelete = () => {
    if (!window.confirm("Delete this restaurant?")) return;
    dispatch(deleteRestaurant(restaurant._id)).catch(() => {
      alert("Unable to delete");
    });
  };

  const submitReview = async (event) => {
    event.preventDefault();
    setReviewSubmitting(true);
    setReviewError("");

    try {
      const { data } = await api.put(`/v1/ai/stores/${restaurant._id}/review`, {
        ...reviewForm,
        rating: Number(reviewForm.rating),
      });
      setReviews(data.restaurant.reviews || []);
      setReviewForm({ name: "", rating: 5, Comment: "" });
      setShowReviewForm(false);
      setShowReviews(true);
    } catch (error) {
      setReviewError(error.response?.data?.message || "Unable to submit review.");
    } finally {
      setReviewSubmitting(false);
    }
  };

  const loadAISummary = async () => {
    if (showAI) {
      setShowAI(false);
      return;
    }

    setShowAI(true);
    setAiLoading(true);
    setAiError("");

    try {
      const { data } = await api.post(`/v1/ai/stores/${restaurant._id}/summary`);
      setAiSummary(data.aiData);
    } catch (error) {
      setAiError(error.response?.data?.message || "Unable to generate the guest summary.");
    } finally {
      setAiLoading(false);
    }
  };

  return (
    <article className="group relative flex flex-col justify-between overflow-hidden rounded-3xl border border-slate-200/80 bg-white/95 shadow-lg backdrop-blur-xl transition-all duration-300 hover:-translate-y-1 hover:border-emerald-500/30 hover:shadow-2xl hover:shadow-emerald-950/10">
      <div>
        {/* Thumbnail Header */}
        <div className="relative aspect-[16/9] w-full overflow-hidden bg-slate-100">
          <Link to={`/eats/stores/${restaurant._id}/menus`}>
            <img
              className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
              src={restaurant.images?.[0]?.url || "/images/template.jpeg"}
              alt={restaurant.name}
              onError={(e) => {
                e.target.onerror = null;
                e.target.src = "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=800";
              }}
            />
            <div className="absolute inset-0 bg-gradient-to-t from-slate-950/70 via-transparent to-transparent opacity-80" />
          </Link>

          {/* Top Badges */}
          <div className="absolute left-3 top-3 flex flex-wrap gap-2">
            {restaurant.isVeg && (
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-600/90 px-3 py-1 text-[11px] font-bold text-white shadow-md backdrop-blur-md">
                <span className="h-1.5 w-1.5 rounded-full bg-white animate-pulse"></span>
                Pure Veg
              </span>
            )}
          </div>

          {/* Rating Badge */}
          <div className="absolute right-3 top-3 flex items-center gap-1.5 rounded-2xl bg-slate-950/75 px-3 py-1.5 text-xs font-bold text-white shadow-md backdrop-blur-md border border-white/10">
            <span className="text-amber-400">★ {Number(restaurant.ratings || 0).toFixed(1)}</span>
            <span className="text-slate-300 font-normal">({restaurant.numOfReviews || 0})</span>
          </div>

          {/* Restaurant Title on Banner */}
          <div className="absolute bottom-3 left-4 right-4">
            <Link to={`/eats/stores/${restaurant._id}/menus`}>
              <h4 className="font-display text-xl font-bold tracking-tight text-white drop-shadow-sm transition hover:text-emerald-300">
                {restaurant.name}
              </h4>
            </Link>
          </div>
        </div>

        {/* Card Content */}
        <div className="p-5 space-y-3">
          <p className="line-clamp-1 text-xs font-medium text-slate-500 flex items-center gap-1">
            <span>📍</span> {restaurant.address}
          </p>

          <div className="flex items-center justify-between text-xs font-semibold text-slate-600 border-t border-b border-slate-100 py-2.5">
            <span className="text-slate-500 bg-slate-100 px-2.5 py-1 rounded-lg">
              {restaurant.cuisine || "Gourmet Cuisine"}
            </span>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap gap-2 pt-1">
            <button
              type="button"
              className="flex-1 rounded-xl border border-slate-200 bg-slate-50/80 px-3 py-2 text-xs font-bold text-slate-700 shadow-sm transition hover:border-emerald-400 hover:bg-emerald-50 hover:text-emerald-800"
              onClick={() => setShowReviews((isOpen) => !isOpen)}
            >
              💬 {showReviews ? "Hide Reviews" : `Reviews (${reviews.length})`}
            </button>
            <button
              type="button"
              className="flex-1 rounded-xl bg-gradient-to-r from-amber-400 to-amber-500 px-3 py-2 text-xs font-bold text-amber-950 shadow-sm transition hover:from-amber-500 hover:to-amber-600 active:scale-95"
              onClick={() => setShowReviewForm((isOpen) => !isOpen)}
            >
              ✍️ {showReviewForm ? "Close Form" : "Write Review"}
            </button>
          </div>

          {/* Reviews Drawer */}
          {showReviews && (
            <div className="mt-3 space-y-2.5 rounded-2xl border border-slate-200/80 bg-slate-50/90 p-4 shadow-inner max-h-56 overflow-y-auto">
              {reviews.length ? (
                reviews.map((review, index) => (
                  <div key={`${review.name}-${index}`} className="border-b border-slate-200/60 pb-2.5 last:border-0 last:pb-0">
                    <div className="flex items-center justify-between gap-2">
                      <strong className="text-xs font-bold text-slate-900">{review.name}</strong>
                      <span className="text-[11px] text-amber-500 font-bold">
                        {"★".repeat(review.rating)}{"☆".repeat(5 - review.rating)}
                      </span>
                    </div>
                    <p className="mt-1 text-xs leading-relaxed text-slate-600">{review.Comment}</p>
                  </div>
                ))
              ) : (
                <p className="text-xs text-slate-500 text-center py-2">No reviews yet. Be the first to rate!</p>
              )}
            </div>
          )}

          {/* Review Submission Form */}
          {showReviewForm && (
            <form onSubmit={submitReview} className="mt-3 rounded-2xl border border-amber-200/80 bg-amber-50/80 p-4 shadow-sm">
              <p className="mb-2 text-xs font-extrabold uppercase tracking-wider text-amber-900">Share your experience</p>
              <div className="grid gap-2.5 sm:grid-cols-2">
                <input
                  required
                  value={reviewForm.name}
                  onChange={(event) => setReviewForm({ ...reviewForm, name: event.target.value })}
                  placeholder="Your name"
                  className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/10"
                />
                <select
                  value={reviewForm.rating}
                  onChange={(event) => setReviewForm({ ...reviewForm, rating: event.target.value })}
                  className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/10 font-medium text-slate-700"
                >
                  {[5, 4, 3, 2, 1].map((rating) => (
                    <option key={rating} value={rating}>{rating} Stars ★</option>
                  ))}
                </select>
              </div>
              <textarea
                required
                value={reviewForm.Comment}
                onChange={(event) => setReviewForm({ ...reviewForm, Comment: event.target.value })}
                placeholder="What did you enjoy about the food & service?"
                rows="2"
                className="mt-2.5 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/10"
              />
              {reviewError && <p className="mt-1.5 text-xs font-semibold text-rose-600">{reviewError}</p>}
              <button
                disabled={reviewSubmitting}
                className="mt-2.5 w-full rounded-xl bg-slate-900 py-2 text-xs font-bold text-white shadow-md transition hover:bg-black disabled:opacity-60"
              >
                {reviewSubmitting ? "Submitting..." : "Post Review"}
              </button>
            </form>
          )}

          {/* AI Sentiment Highlight Toggle */}
          <>
            <button
              type="button"
              className="w-full flex items-center justify-between rounded-2xl border border-emerald-200 bg-emerald-50/70 px-4 py-2.5 text-xs font-bold text-emerald-800 transition hover:bg-emerald-100"
              onClick={isAuthenticated ? loadAISummary : () => navigate("/users/login")}
            >
              <span className="flex items-center gap-1.5">
                <span className="text-emerald-600">✨</span> AI Guest Insights Summary
              </span>
              <span>{showAI ? "▲" : "▼"}</span>
            </button>
          </>

          {/* AI Sentiment Box */}
          {showAI && (
            <div className="rounded-2xl border border-emerald-200 bg-gradient-to-br from-emerald-50 via-teal-50/30 to-white p-4 text-xs leading-relaxed text-slate-700 shadow-sm animate-in fade-in duration-200">
              <div className="mb-2.5 flex items-center justify-between">
                <span className="font-extrabold uppercase tracking-wider text-emerald-900 text-[10px]">Guest Sentiment</span>
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-600 px-2.5 py-0.5 font-bold text-white text-[11px]">
                  😊 {aiSummary.sentiment || "No summary yet"}
                </span>
              </div>

              {aiLoading ? (
                <p className="text-slate-600">Analyzing guest reviews...</p>
              ) : aiError ? (
                <p className="text-rose-600">{aiError}</p>
              ) : aiSummary.summaryBullets.length > 0 ? (
                <ul className="space-y-1.5 mb-3">
                  {aiSummary.summaryBullets.map((point, index) => (
                    <li key={index} className="flex items-start gap-1.5">
                      <span className="text-emerald-600 font-bold">✓</span>
                      <span>{point}</span>
                    </li>
                  ))}
                </ul>
              ) : null}

              {!aiLoading && !aiError && aiSummary.topMentions.length > 0 && (
                <div className="flex flex-wrap gap-1.5 pt-2 border-t border-emerald-100">
                  {aiSummary.topMentions.map((item, index) => (
                    <span
                      key={index}
                      className="rounded-full bg-emerald-100/90 px-2.5 py-0.5 text-[10px] font-bold text-emerald-800"
                    >
                      #{item}
                    </span>
                  ))}
                </div>
              )}

              {!aiLoading && !aiError && !aiSummary.summaryBullets.length && (
                <p className="text-slate-600">AI guest insights will appear after this restaurant receives reviews.</p>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Footer link to menu */}
      <div className="p-4 pt-0 flex items-center justify-between border-t border-slate-100">
        <Link
          to={`/eats/stores/${restaurant._id}/menus`}
          className="w-full flex items-center justify-center gap-1.5 rounded-2xl bg-slate-900 py-3 text-xs font-bold text-white shadow-md transition-all hover:bg-emerald-600 active:scale-[0.98]"
        >
          <span>View Menu & Order</span>
          <span>→</span>
        </Link>

        {isAuthenticated && user && user.role === "admin" && (
          <button
            className="ml-2 rounded-xl bg-rose-50 px-3 py-3 text-xs font-bold text-rose-600 transition hover:bg-rose-600 hover:text-white"
            onClick={handleDelete}
            title="Delete Restaurant"
          >
            🗑
          </button>
        )}
      </div>
    </article>
  );
};

export default Restaurant;
