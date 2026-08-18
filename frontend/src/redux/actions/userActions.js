//Dispatch => Call API =>Update state based on success or failure

import api from "../../utils/api";
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
  updateReset,
  clearErrors,
} from "../slices/userSlice";

// LOGIN

export const login = (email, password) => async (dispatch) => {
  try {
    dispatch(loginRequest());
    const { data } = await api.post("/v1/users/login", {
      email,
      password,
    });
    if (data.token) {
      localStorage.setItem("token", data.token);
    }
    dispatch(loginSuccess(data.data.user));
  } catch (error) {
    localStorage.removeItem("token");
    dispatch(
      loginFail(
        error.response?.data?.message ||
          error.response?.data?.errMessage ||
          "Login failed. Please try again."
      )
    );
  }
};

//Register
export const register = (userData) => async (dispatch) => {
  try {
    dispatch(loginRequest());

    const { data } = await api.post("/v1/users/signup", userData, {
      headers: { "Content-Type": "application/json" },
    });
    if (data.token) {
      localStorage.setItem("token", data.token);
    }
    dispatch(loginSuccess(data.data.user));
  } catch (error) {
    localStorage.removeItem("token");
    dispatch(
      loginFail(
        error.response?.data?.message ||
          error.response?.data?.errMessage ||
          "Registration failed."
      )
    );
  }
};

//load user
export const loadUser = () => async (dispatch) => {
  try {
    dispatch(loginRequest());

    const { data } = await api.get("/v1/users/me");
    if (data.token) {
      localStorage.setItem("token", data.token);
    }
    dispatch(loginSuccess(data.user));
  } catch (error) {
    localStorage.removeItem("token");
    dispatch(
      loadUserFail(
        error.response?.data?.message || error.response?.data?.errMessage
      )
    );
  }
};

//update profile

export const updateProfile = (userData) => async (dispatch) => {
  try {
    dispatch(updateRequest());

    const { data } = await api.put("/v1/users/me/update", userData);
    dispatch(updateSuccess(data.success));
  } catch (error) {
    dispatch(updateFail(error.response?.data?.message));
  }
};

//logout
export const logout = () => async (dispatch) => {
  try {
    await api.get("/v1/users/logout");
    localStorage.removeItem("token");
    dispatch(logoutSuccess());
  } catch (error) {
    localStorage.removeItem("token");
    dispatch(logoutFail(error.response?.data?.message));
  }
};
