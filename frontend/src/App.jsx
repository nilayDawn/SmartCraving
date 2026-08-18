import React, { lazy, Suspense, useEffect } from "react";

import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Home from "./components/Home";
import Header from "./components/layout/Header";
import Footer from "./components/layout/Footer";
import Menu from "./components/Menu";
import { loadUser } from "./redux/actions/userActions";
import store from "./redux/store";
import Login from "./components/user/Login";
import Register from "./components/user/Register";
import Profile from "./components/user/Profile";
import UpdateProfile from "./components/user/UpdateProfile";
import ForgotPassword from "./components/user/ForgotPassword";
import NewPassword from "./components/user/NewPassword";
import GuestRoute from "./components/user/GuestRoute";
import ProtectedRoute from "./components/user/ProtectedRoute";

import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import Cart from "./components/cart/Cart";

import OrderSuccess from "./components/cart/OrderSuccess";
import ListOrders from "./components/order/ListOrders";
import OrderDetails from "./components/order/OrderDetails";
import FoodItemDetails from "./components/FoodItemDetails";

import Landing from "./components/Landing";

import AdminRoute from "./components/admin/AdminRoute";
import Loader from "./components/layout/Loader";

const AdminDashboard = lazy(() => import("./components/admin/AdminDashboard"));
const AddRestaurant = lazy(() => import("./components/admin/AddRestaurant"));
const AddFoodItem = lazy(() => import("./components/admin/AddFoodItem"));
const AdminOrders = lazy(() => import("./components/admin/AdminOrders"));
const AdminCoupons = lazy(() => import("./components/admin/AdminCoupons"));

function App() {
  useEffect(() => {
    store.dispatch(loadUser());
  }, []);

  return (
    <>
      <ToastContainer />
      <Router>
        <div className="min-h-screen bg-slate-50 text-slate-900">
          <Header />
          <main className="mx-auto min-h-[calc(100vh-10rem)] w-full max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
            <Suspense fallback={<Loader />}>
            <Routes>
              <Route path="/" element={<Landing />} />
              <Route path="/restaurants" element={<Home />} />
              <Route path="/about" element={<Landing />} />
              <Route path="/landing" element={<Landing />} />
              <Route
                path="/eats/stores/search/:keyword"
                element={<Home />}
              />
              <Route path="/eats/stores/:id/menus" element={<Menu />} />
              <Route path="/eats/food/:id" element={<FoodItemDetails />} />

              {/* admin routes */}
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

              {/* user */}
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
              <Route path="/users/me" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
              <Route path="/users/me/update" element={<ProtectedRoute><UpdateProfile /></ProtectedRoute>} />
              <Route path="/users/forgetPassword" element={<ForgotPassword />} />
              <Route path="/users/resetPassword/:token" element={<NewPassword />} />

              {/* cart */}

              <Route path="/cart" element={<Cart />} />

              {/* order */}
              <Route path="/success" element={<ProtectedRoute><OrderSuccess /></ProtectedRoute>} />
              <Route path="/eats/orders/me/myOrders" element={<ProtectedRoute><ListOrders /></ProtectedRoute>} />
              <Route path="/eats/orders/:id" element={<ProtectedRoute><OrderDetails /></ProtectedRoute>} />
            </Routes>
            </Suspense>
          </main>
          <Footer />
        </div>
      </Router>
    </>
  );
}

export default App;
