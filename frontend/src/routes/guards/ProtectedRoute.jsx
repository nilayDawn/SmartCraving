import React from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useSelector } from "react-redux";
import Loader from "../../components/common/Loader";

const ProtectedRoute = ({ children }) => {
  const { isAuthenticated, initialLoading } = useSelector((state) => state.user);
  const location = useLocation();

  if (initialLoading) return <Loader />;
  if (!isAuthenticated) return <Navigate to="/users/login" replace state={{ from: location }} />;

  return children;
};

export default ProtectedRoute;
