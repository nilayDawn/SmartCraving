import React from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useSelector } from "react-redux";
import Loader from "../layout/Loader";

const ProtectedRoute = ({ children }) => {
  const { isAuthenticated, loading } = useSelector((state) => state.user);
  const location = useLocation();

  if (loading) return <Loader />;
  if (!isAuthenticated) return <Navigate to="/users/login" replace state={{ from: location }} />;

  return children;
};

export default ProtectedRoute;
