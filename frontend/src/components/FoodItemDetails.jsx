import { useEffect, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faIndianRupeeSign } from "@fortawesome/free-solid-svg-icons";
import api from "../utils/api";
import { addItemToCart, removeItemFromCart, updateCartQuantity } from "../redux/actions/cartActions";

const FoodItemDetails = () => {
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { user } = useSelector((state) => state.user);
  const { cartItems } = useSelector((state) => state.cart);
  const [food, setFood] = useState(null);
  const [restaurant, setRestaurant] = useState(null);
  const [error, setError] = useState("");
  const [quantity, setQuantity] = useState(1);
  const [reviewForm, setReviewForm] = useState({ name: user?.name || "", rating: 5, Comment: "" });
  const [reviewError, setReviewError] = useState("");
  const [reviewSubmitting, setReviewSubmitting] = useState(false);
  const [cartError, setCartError] = useState("");

  useEffect(() => {
    const loadFood = async () => {
      try {
        const { data } = await api.get(`/v1/eats/item/${id}`);
        setFood(data.data);
      } catch (requestError) {
        setError(requestError.response?.data?.message || "Unable to load food details.");
      }
    };

    loadFood();
  }, [id]);

  useEffect(() => {
    const restaurantId = food?.restaurant?._id || food?.restaurant || searchParams.get("restaurant");
    if (!restaurantId) return;

    const loadRestaurant = async () => {
      try {
        const { data } = await api.get(`/v1/eats/stores/${restaurantId}`);
        setRestaurant(data.data);
      } catch {
        // The dish details remain usable even when restaurant metadata is unavailable.
      }
    };

    loadRestaurant();
  }, [food, searchParams]);

  useEffect(() => {
    if (user?.name) setReviewForm((form) => ({ ...form, name: form.name || user.name }));
  }, [user]);

  useEffect(() => {
    const cartItem = cartItems.find((item) => item.foodItem?._id === id || item.foodItem === id);
    setQuantity(cartItem?.quantity || 1);
  }, [cartItems, id]);

  const cartItem = cartItems.find((item) => item.foodItem?._id === id || item.foodItem === id);
  const changeQuantity = (nextQuantity) => {
    if (!cartItem || nextQuantity < 1) return;
    setQuantity(nextQuantity);
    dispatch(updateCartQuantity(id, nextQuantity));
  };

  const addToCart = async () => {
    if (!user) return navigate("/users/login");
    const restaurantId = food.restaurant?._id || food.restaurant || searchParams.get("restaurant");
    if (!restaurantId) {
      setCartError("This food item is not linked to a restaurant.");
      return;
    }

    setCartError("");
    const cart = await dispatch(addItemToCart(food._id, restaurantId, quantity));
    if (cart) {
      navigate("/cart");
    } else {
      setCartError("Unable to add this item to your cart. Please try again.");
    }
  };

  const submitReview = async (event) => {
    event.preventDefault();
    setReviewSubmitting(true);
    setReviewError("");
    try {
      const { data } = await api.put(`/v1/eats/item/${food._id}/review`, { ...reviewForm, rating: Number(reviewForm.rating) });
      setFood(data.data);
      setReviewForm((form) => ({ ...form, Comment: "", rating: 5 }));
    } catch (requestError) {
      setReviewError(requestError.response?.data?.message || "Unable to submit review.");
    } finally {
      setReviewSubmitting(false);
    }
  };

  if (error) {
    return <div className="mx-auto max-w-xl my-12 rounded-3xl bg-white p-8 text-center text-rose-600 shadow-lg">{error}</div>;
  }

  if (!food) {
    return <div className="mx-auto max-w-xl my-12 rounded-3xl bg-white p-8 text-center text-slate-500 shadow-lg font-bold">Loading culinary creation...</div>;
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 space-y-8">
      <button
        type="button"
        onClick={() => navigate(-1)}
        className="inline-flex items-center gap-1.5 rounded-xl bg-white/80 px-4 py-2 text-xs font-bold text-slate-700 shadow-sm transition hover:bg-white hover:text-emerald-700"
      >
        <span>←</span> Back to Menu
      </button>

      <article className="rounded-3xl border border-slate-200/80 bg-white/95 p-6 shadow-2xl backdrop-blur-xl sm:p-10">
        <div className="grid gap-10 lg:grid-cols-2 items-center">
          <div className="relative overflow-hidden rounded-3xl bg-slate-100 shadow-md aspect-square">
            <img
              className="h-full w-full object-cover transition-transform duration-500 hover:scale-105"
              src={food.images?.[0]?.url || "/images/template.jpeg"}
              alt={food.name}
            />
            {food.ratings > 0 && (
              <div className="absolute top-4 left-4 inline-flex items-center gap-1 rounded-2xl bg-white/90 px-3.5 py-1.5 text-xs font-black text-slate-900 shadow-md backdrop-blur-md">
                <span className="text-amber-500">★</span> {food.ratings.toFixed(1)}
              </div>
            )}
          </div>

          <div className="space-y-5">
            <div>
              <span className="text-xs font-bold uppercase tracking-widest text-emerald-600">Gourmet Selection</span>
              <h1 className="font-display text-3xl font-extrabold text-slate-900 sm:text-4xl mt-1">{food.name}</h1>
              <p className="mt-3 text-sm leading-relaxed text-slate-600">{food.description}</p>
            </div>

            <div className="flex items-center justify-between border-y border-slate-100 py-4">
              <div>
                <span className="text-xs text-slate-400 font-bold uppercase">Price</span>
                <p className="font-display text-3xl font-black text-slate-900">
                  <FontAwesomeIcon icon={faIndianRupeeSign} size="xs" className="mr-0.5 text-xl text-emerald-600" />
                  {food.price}
                </p>
              </div>

              <div className="text-right">
                <span className="text-xs text-slate-400 font-bold uppercase">Availability</span>
                <p className={`text-sm font-bold flex items-center justify-end gap-1.5 mt-0.5 ${food.stock > 0 ? "text-emerald-700" : "text-rose-600"}`}>
                  <span className={`h-2 w-2 rounded-full ${food.stock > 0 ? "bg-emerald-500" : "bg-rose-500"}`} />
                  {food.stock > 0 ? `${food.stock} portions left` : "Sold Out"}
                </p>
              </div>
            </div>

            {cartItem ? (
              <div className="flex flex-wrap items-center gap-3">
                <div className="flex items-center rounded-2xl bg-slate-100 p-1.5 border border-slate-200/80">
                  <button
                    type="button"
                    onClick={() => quantity === 1 ? dispatch(removeItemFromCart(food._id)) : changeQuantity(quantity - 1)}
                    className="flex h-10 w-10 items-center justify-center rounded-xl bg-white font-black text-slate-700 shadow-sm transition hover:bg-slate-200"
                  >
                    −
                  </button>
                  <span className="w-12 text-center font-display text-base font-black text-slate-900">{quantity}</span>
                  <button
                    type="button"
                    onClick={() => quantity < food.stock && changeQuantity(quantity + 1)}
                    disabled={quantity >= food.stock}
                    className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-600 font-black text-white shadow-sm transition hover:bg-emerald-700 disabled:opacity-50"
                  >
                    +
                  </button>
                </div>

                <button
                  type="button"
                  onClick={() => dispatch(removeItemFromCart(food._id))}
                  className="rounded-2xl bg-rose-50 px-4 py-3 text-xs font-bold text-rose-600 transition hover:bg-rose-600 hover:text-white"
                >
                  Remove from Cart
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={addToCart}
                disabled={!food.stock}
                className="w-full rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 py-4 font-display text-base font-bold text-white shadow-lg shadow-emerald-600/25 transition hover:from-emerald-700 hover:to-teal-700 active:scale-[0.98] disabled:opacity-50"
              >
                {food.stock ? " Add to Cart" : "Currently Unavailable"}
              </button>
            )}

            {cartError && <p className="rounded-xl bg-rose-50 p-3 text-xs font-bold text-rose-700">{cartError}</p>}

            {food.aiDescription && (
              <div className="rounded-2xl border border-emerald-100 bg-emerald-50/70 p-4">
                <h3 className="font-bold text-xs uppercase tracking-wider text-emerald-800">✨ Chef's AI Note</h3>
                <p className="mt-1 text-xs leading-relaxed text-slate-700">{food.aiDescription}</p>
              </div>
            )}

            {food.aiTags?.length > 0 && (
              <div className="flex flex-wrap gap-2 pt-2">
                {food.aiTags.map((tag) => (
                  <span key={tag} className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-700">
                    #{tag}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Reviews section */}
        <div className="mt-12 border-t border-slate-100 pt-8 space-y-8">
          {restaurant && (
            <div className="rounded-3xl border border-emerald-100 bg-emerald-50/60 p-6 space-y-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <span className="text-[10px] font-extrabold uppercase tracking-widest text-emerald-700">Restaurant Insights</span>
                  <h3 className="font-display text-xl font-black text-slate-900">What guests say about {restaurant.name}</h3>
                </div>
                {restaurant.reviewSentiment && (
                  <span className="rounded-full bg-white px-3.5 py-1 text-xs font-bold text-emerald-800 shadow-xs capitalize">
                    {restaurant.reviewSentiment} sentiment
                  </span>
                )}
              </div>
              {restaurant.reviewSummaryBullets?.length ? (
                <ul className="grid gap-2 text-xs font-medium text-slate-700 sm:grid-cols-2">
                  {restaurant.reviewSummaryBullets.map((point, index) => (
                    <li key={`${point}-${index}`} className="rounded-xl bg-white/90 p-3 shadow-xs">
                      • {point}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-xs text-slate-600">AI summary insights will update after reviews are posted.</p>
              )}
            </div>
          )}

          <div>
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-display text-2xl font-extrabold text-slate-900">Customer Reviews</h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  {food.numOfReviews || 0} verified reviews · {food.ratings ? `${food.ratings.toFixed(1)} out of 5 stars` : "No rating yet"}
                </p>
              </div>
            </div>

            {food.reviews?.length ? (
              <div className="mt-6 grid gap-4 sm:grid-cols-2">
                {food.reviews.map((review, index) => (
                  <div key={`${review.name}-${index}`} className="rounded-2xl border border-slate-100 bg-slate-50/80 p-4 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-sm text-slate-900">{review.name}</span>
                      <span className="text-xs text-amber-500 font-bold">{"★".repeat(review.rating)}</span>
                    </div>
                    <p className="text-xs leading-relaxed text-slate-600">{review.Comment}</p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="mt-4 text-sm text-slate-500">Be the first to review this dish!</p>
            )}
          </div>

          {/* Leave a review form */}
          <form onSubmit={submitReview} className="rounded-3xl border border-slate-200/80 bg-slate-50/50 p-6 space-y-4">
            <h3 className="font-display text-lg font-bold text-slate-900">Write a Review</h3>

            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">Your Name</label>
                <input
                  required
                  value={reviewForm.name}
                  onChange={(event) => setReviewForm({ ...reviewForm, name: event.target.value })}
                  placeholder="Enter name"
                  className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">Rating</label>
                <select
                  value={reviewForm.rating}
                  onChange={(event) => setReviewForm({ ...reviewForm, rating: event.target.value })}
                  className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 outline-none focus:border-emerald-500"
                >
                  {[5, 4, 3, 2, 1].map((rating) => (
                    <option key={rating} value={rating}>
                      {rating} Star{rating > 1 ? "s" : ""}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">Your Experience</label>
              <textarea
                required
                rows="3"
                value={reviewForm.Comment}
                onChange={(event) => setReviewForm({ ...reviewForm, Comment: event.target.value })}
                placeholder="Share taste, presentation, or delivery notes..."
                className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm outline-none focus:border-emerald-500"
              />
            </div>

            {reviewError && <p className="text-xs font-bold text-rose-600">{reviewError}</p>}

            <button
              disabled={reviewSubmitting}
              className="rounded-xl bg-emerald-600 px-5 py-2.5 text-xs font-bold text-white shadow-md hover:bg-emerald-700 disabled:opacity-60"
            >
              {reviewSubmitting ? "Submitting..." : "Submit Review"}
            </button>
          </form>
        </div>
      </article>
    </div>
  );
};

export default FoodItemDetails;
