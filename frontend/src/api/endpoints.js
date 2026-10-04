/**
 * Centralized API Endpoints Dictionary
 * All client API URLs mapped to backend domain routes.
 */
export const ENDPOINTS = {
  AUTH: {
    SIGNUP: "/v1/users/signup",
    LOGIN: "/v1/users/login",
    LOGOUT: "/v1/users/logout",
    ME: "/v1/users/me",
    UPDATE_PROFILE: "/v1/users/me/update",
    UPDATE_PASSWORD: "/v1/users/password/update",
    FORGOT_PASSWORD: "/v1/users/forgetPassword",
    RESET_PASSWORD: (token) => `/v1/users/resetPassword/${token}`,
  },
  CATALOGUE: {
    STORES: "/v1/eats/stores",
    STORE_BY_ID: (id) => `/v1/eats/stores/${id}`,
    STORE_MENUS: (storeId) => `/v1/eats/stores/${storeId}/menus`,
    STORE_MENU_ADD_ITEM: (storeId, menuId) => `/v1/eats/stores/${storeId}/menus/${menuId}/addItem`,
    STORE_MENU_DELETE: (storeId, menuId) => `/v1/eats/stores/${storeId}/menus/${menuId}`,
    RESTAURANTS_COUNT: "/v1/eats/restaurants/count",
    CREATE_ITEM: "/v1/eats/item",
    ITEMS_BY_STORE: (storeId) => `/v1/eats/items/${storeId}`,
    ITEM_BY_ID: (id) => `/v1/eats/item/${id}`,
    ITEM_REVIEW: (id) => `/v1/eats/item/${id}/review`,
  },
  CART: {
    GET_CART: "/v1/eats/cart/get-cart",
    ADD_TO_CART: "/v1/eats/cart/add-to-cart",
    UPDATE_QUANTITY: "/v1/eats/cart/update-cart-item",
    DELETE_ITEM: "/v1/eats/cart/delete-cart-item",
  },
  ORDERS: {
    NEW: "/v1/eats/orders/new",
    MY_ORDERS: "/v1/eats/orders/me/myOrders",
    ORDER_BY_ID: (id) => `/v1/eats/orders/${id}`,
    ADMIN_ALL: "/v1/eats/orders/admin",
    UPDATE_STATUS: (id) => `/v1/eats/orders/${id}/status`,
  },
  PAYMENT: {
    PROCESS: "/v1/payment/process",
    STRIPE_KEY: "/v1/stripeapi",
  },
  PROMOTION: {
    COUPONS: "/v1/coupon",
    COUPON_BY_ID: (id) => `/v1/coupon/${id}`,
    VALIDATE: "/v1/coupon/validate",
  },
  AI: {
    GENERATE_FOOD: "/v1/ai/generate-food",
    GENERATE_AND_SAVE_FOOD: (foodId) => `/v1/ai/generate-food-ai/${foodId}`,
    ANALYZE_RESTAURANT: (id) => `/v1/ai/admin/restaurants/${id}/analyze`,
    RESTAURANT_SUMMARY: (id) => `/v1/ai/stores/${id}/summary`,
    FOOD_SUMMARY: (id) => `/v1/ai/items/${id}/summary`,
    ADD_STORE_REVIEW: (id) => `/v1/ai/stores/${id}/review`,
    DELETE_STORE_REVIEW: (id, reviewId) => `/v1/ai/stores/${id}/reviews/${reviewId}`,
    DELETE_FOOD_REVIEW: (id, reviewId) => `/v1/ai/items/${id}/reviews/${reviewId}`,
  },
};
