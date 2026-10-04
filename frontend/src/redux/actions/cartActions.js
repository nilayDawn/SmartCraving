import api from "../../api/client";
import { ENDPOINTS } from "../../api/endpoints";
import {
  cartRequest,
  cartSuccess,
  cartFail,
  updateCartSuccess,
  removeCartSuccess,
} from "../slices/cartSlice";

// Fetch cart items
export const fetchCartItems = () => async (dispatch) => {
  try {
    dispatch(cartRequest());
    const { data } = await api.get(ENDPOINTS.CART.GET_CART);
    dispatch(cartSuccess(data.data || data.cart));
  } catch (error) {
    dispatch(cartFail(error.response?.data?.message));
  }
};

// Add cart items
export const addItemToCart = (foodItemId, restaurantId, quantity) => async (dispatch) => {
  try {
    dispatch(cartRequest());
    const { data } = await api.post(ENDPOINTS.CART.ADD_TO_CART, {
      foodItemId,
      restaurantId,
      quantity,
    });
    dispatch(cartSuccess(data.cart || data.data));
    return data.cart || data.data;
  } catch (error) {
    dispatch(cartFail(error.response?.data?.message));
    return null;
  }
};

// Update cart quantity
export const updateCartQuantity = (foodItemId, quantity) => async (dispatch) => {
  try {
    const { data } = await api.post(ENDPOINTS.CART.UPDATE_QUANTITY, {
      foodItemId,
      quantity,
    });
    dispatch(updateCartSuccess(data.cart || data.data));
  } catch (error) {
    dispatch(cartFail(error.response?.data?.message));
  }
};

// Remove item from cart
export const removeItemFromCart = (foodItemId) => async (dispatch) => {
  try {
    const { data } = await api.delete(ENDPOINTS.CART.DELETE_ITEM, {
      data: { foodItemId },
    });
    dispatch(removeCartSuccess(data));
  } catch (error) {
    dispatch(cartFail(error.response?.data?.message));
  }
};
