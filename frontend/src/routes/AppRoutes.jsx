import React, { lazy, Suspense } from "react";
import { Routes, Route } from "react-router-dom";
import Loader from "../components/common/Loader";

// Route Guards
import ProtectedRoute from "./guards/ProtectedRoute";
import GuestRoute from "./guards/GuestRoute";
import AdminRoute from "./guards/AdminRoute";

// Lazy-Loaded Feature Modules (Catalogue & Discovery)
const Landing = lazy(() => import("../features/catalogue/Landing"));
const Home = lazy(() => import("../features/catalogue/Home"));
const Menu = lazy(() => import("../features/catalogue/Menu"));
const FoodItemDetails = lazy(() => import("../features/catalogue/FoodItemDetails"));

// Lazy-Loaded Feature Modules (Auth & Profile)
const Login = lazy(() => import("../features/auth/Login"));
const Register = lazy(() => import("../features/auth/Register"));
const Profile = lazy(() => import("../features/auth/Profile"));
const UpdateProfile = lazy(() => import("../features/auth/UpdateProfile"));
const ForgotPassword = lazy(() => import("../features/auth/ForgotPassword"));
const NewPassword = lazy(() => import("../features/auth/NewPassword"));

// Lazy-Loaded Feature Modules (Cart & Checkout)
const Cart = lazy(() => import("../features/cart/Cart"));
const OrderSuccess = lazy(() => import("../features/cart/OrderSuccess"));

// Lazy-Loaded Feature Modules (Orders)
const ListOrders = lazy(() => import("../features/orders/ListOrders"));
const OrderDetails = lazy(() => import("../features/orders/OrderDetails"));

// Lazy-Loaded Feature Modules (Admin)
const AdminDashboard = lazy(() => import("../features/admin/AdminDashboard"));
const AddRestaurant = lazy(() => import("../features/admin/AddRestaurant"));
const AddFoodItem = lazy(() => import("../features/admin/AddFoodItem"));
const AdminOrders = lazy(() => import("../features/admin/AdminOrders"));
const AdminCoupons = lazy(() => import("../features/admin/AdminCoupons"));

const AppRoutes = () => {
  return (
    <Suspense fallback={<Loader />}>
      <Routes>
        {/* Public Discovery Routes */}
        <Route path="/" element={<Landing />} />
        <Route path="/landing" element={<Landing />} />
        <Route path="/about" element={<Landing />} />
        <Route path="/restaurants" element={<Home />} />
        <Route path="/eats/stores/search/:keyword" element={<Home />} />
        <Route path="/eats/stores/:id/menus" element={<Menu />} />
        <Route path="/eats/food/:id" element={<FoodItemDetails />} />

        {/* Guest Authentication Routes */}
        <Route
          path="/users/login"
          element={
            <GuestRoute>
              <Login />
            </GuestRoute>
          }
        />
        <Route
          path="/users/signup"
          element={
            <GuestRoute>
              <Register />
            </GuestRoute>
          }
        />
        <Route path="/users/forgetPassword" element={<ForgotPassword />} />
        <Route path="/users/resetPassword/:token" element={<NewPassword />} />

        {/* Customer Protected Routes */}
        <Route
          path="/users/me"
          element={
            <ProtectedRoute>
              <Profile />
            </ProtectedRoute>
          }
        />
        <Route
          path="/users/me/update"
          element={
            <ProtectedRoute>
              <UpdateProfile />
            </ProtectedRoute>
          }
        />
        <Route path="/cart" element={<Cart />} />
        <Route
          path="/success"
          element={
            <ProtectedRoute>
              <OrderSuccess />
            </ProtectedRoute>
          }
        />
        <Route
          path="/eats/orders/me/myOrders"
          element={
            <ProtectedRoute>
              <ListOrders />
            </ProtectedRoute>
          }
        />
        <Route
          path="/eats/orders/:id"
          element={
            <ProtectedRoute>
              <OrderDetails />
            </ProtectedRoute>
          }
        />

        {/* Admin Management Routes */}
        <Route
          path="/admin/dashboard"
          element={
            <AdminRoute>
              <AdminDashboard />
            </AdminRoute>
          }
        />
        <Route
          path="/admin/restaurants/new"
          element={
            <AdminRoute>
              <AddRestaurant />
            </AdminRoute>
          }
        />
        <Route
          path="/admin/items/new"
          element={
            <AdminRoute>
              <AddFoodItem />
            </AdminRoute>
          }
        />
        <Route
          path="/admin/orders"
          element={
            <AdminRoute>
              <AdminOrders />
            </AdminRoute>
          }
        />
        <Route
          path="/admin/coupons"
          element={
            <AdminRoute>
              <AdminCoupons />
            </AdminRoute>
          }
        />
      </Routes>
    </Suspense>
  );
};

export default AppRoutes;
