import React from "react";
import { Navigate } from "react-router-dom";
import { useSelector } from "react-redux";
import Loader from "../layout/Loader";

const GuestRoute = ({ children }) => {
  const { isAuthenticated, loading } = useSelector((state) => state.user);

  // Wait until the app has finished restoring the session before deciding
  // whether the guest-only page should be shown.
  if (loading) {
    return <Loader />;
  }

  if (isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  return children;
};

export default GuestRoute;
