import React from "react";
import { useSelector } from "react-redux";
import { Navigate } from "react-router-dom";

const AdminRoute = ({ children }) => {
  const { user, isAuthenticated, loading } = useSelector((state) => state.user);

  if (loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center p-8 text-slate-600">
        <div className="flex items-center gap-3">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-emerald-600 border-t-transparent"></div>
          <span className="font-semibold text-slate-700">Verifying admin access...</span>
        </div>
      </div>
    );
  }

  if (!isAuthenticated || user?.role !== "admin") {
    return <Navigate to="/restaurants" replace />;
  }

  return children;
};

export default AdminRoute;
