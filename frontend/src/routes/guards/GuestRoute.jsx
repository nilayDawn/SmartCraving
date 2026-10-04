import React from "react";
import { Navigate } from "react-router-dom";
import { useSelector } from "react-redux";
import Loader from "../../components/common/Loader";

const GuestRoute = ({ children }) => {
  const { isAuthenticated, initialLoading } = useSelector((state) => state.user);

  if (initialLoading) {
    return <Loader />;
  }

  if (isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  return children;
};

export default GuestRoute;
