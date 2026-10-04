import api from "../../api/client";
import { ENDPOINTS } from "../../api/endpoints";
import {
  loginRequest,
  loginSuccess,
  loginFail,
  loadUserFail,
  logoutSuccess,
  logoutFail,
  updateRequest,
  updateSuccess,
  updateFail,
} from "../slices/userSlice";

// LOGIN
export const login = (email, password) => async (dispatch) => {
  try {
    dispatch(loginRequest());
    const { data } = await api.post(ENDPOINTS.AUTH.LOGIN, {
      email,
      password,
    });
    if (data.token) {
      localStorage.setItem("token", data.token);
    }
    const user = data.data?.user || data.user;
    dispatch(loginSuccess(user));
  } catch (error) {
    localStorage.removeItem("token");
    dispatch(
      loginFail(
        error.response?.data?.message ||
          error.response?.data?.errMessage ||
          "Login failed. Please try again.",
      ),
    );
  }
};

// Register
export const register = (userData) => async (dispatch) => {
  try {
    dispatch(loginRequest());

    const { data } = await api.post(ENDPOINTS.AUTH.SIGNUP, userData, {
      headers: { "Content-Type": "application/json" },
    });
    if (data.token) {
      localStorage.setItem("token", data.token);
    }
    const user = data.data?.user || data.user;
    dispatch(loginSuccess(user));
  } catch (error) {
    localStorage.removeItem("token");
    dispatch(
      loginFail(
        error.response?.data?.message ||
          error.response?.data?.errMessage ||
          "Registration failed.",
      ),
    );
  }
};

// Load User
export const loadUser = () => async (dispatch) => {
  try {
    dispatch(loginRequest());

    const { data } = await api.get(ENDPOINTS.AUTH.ME);
    if (data.token) {
      localStorage.setItem("token", data.token);
    }
    const user = data.user || data.data?.user;
    dispatch(loginSuccess(user));
  } catch (error) {
    localStorage.removeItem("token");
    dispatch(
      loadUserFail(
        error.response?.data?.message || error.response?.data?.errMessage,
      ),
    );
  }
};

// Update Profile
export const updateProfile = (userData) => async (dispatch) => {
  try {
    dispatch(updateRequest());

    const { data } = await api.put(ENDPOINTS.AUTH.UPDATE_PROFILE, userData);
    dispatch(updateSuccess(data.success));
  } catch (error) {
    dispatch(updateFail(error.response?.data?.message));
  }
};

// Logout
export const logout = () => async (dispatch) => {
  try {
    await api.get(ENDPOINTS.AUTH.LOGOUT);
    localStorage.removeItem("token");
    dispatch(logoutSuccess());
  } catch (error) {
    localStorage.removeItem("token");
    dispatch(logoutFail(error.response?.data?.message));
  }
};
