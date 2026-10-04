import api from "../../api/client";
import { ENDPOINTS } from "../../api/endpoints";
import {
  createOrderRequest,
  createOrderSuccess,
  createOrderFail,
  paymentRequest,
  paymentSuccess,
  paymentFail,
  myOrdersRequest,
  myOrdersSuccess,
  myOrdersFail,
  orderDetailsRequest,
  orderDetailsSuccess,
  orderDetailsFail,
} from "../slices/orderSlice";

// Create order
export const createOrder = (session_id) => async (dispatch) => {
  try {
    dispatch(createOrderRequest());
    const { data } = await api.post(
      ENDPOINTS.ORDERS.NEW,
      { session_id },
      { headers: { "Content-Type": "application/json" } },
    );
    dispatch(createOrderSuccess(data));
  } catch (error) {
    dispatch(createOrderFail(error.response?.data?.message));
  }
};

// Payment process
export const payment = (items, restaurant, couponCode) => async (dispatch) => {
  try {
    dispatch(paymentRequest());
    const { data } = await api.post(
      ENDPOINTS.PAYMENT.PROCESS,
      { items, restaurant, couponCode },
      { headers: { "Content-Type": "application/json" } },
    );

    if (data.url) {
      window.location.assign(data.url);
    }

    dispatch(paymentSuccess());
  } catch (error) {
    dispatch(paymentFail(error.response?.data?.message));
  }
};

// My orders
export const myOrders = () => async (dispatch) => {
  try {
    dispatch(myOrdersRequest());
    const { data } = await api.get(ENDPOINTS.ORDERS.MY_ORDERS);
    dispatch(myOrdersSuccess(data.orders));
  } catch (error) {
    dispatch(myOrdersFail(error.response?.data?.message));
  }
};

// Order details
export const getOrderDetails = (id) => async (dispatch) => {
  try {
    dispatch(orderDetailsRequest());
    const { data } = await api.get(ENDPOINTS.ORDERS.ORDER_BY_ID(id));
    dispatch(orderDetailsSuccess(data.order));
  } catch (error) {
    dispatch(orderDetailsFail(error.response?.data?.message));
  }
};
