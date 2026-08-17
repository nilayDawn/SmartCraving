import React, { useEffect } from "react";

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

import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import Cart from "./components/cart/Cart";

import OrderSuccess from "./components/cart/OrderSuccess";
import ListOrders from "./components/order/ListOrders";
import OrderDetails from "./components/order/OrderDetails";
import FoodItemDetails from "./components/FoodItemDetails";

import Landing from "./components/Landing";

import AdminRoute from "./components/admin/AdminRoute";
import AdminDashboard from "./components/admin/AdminDashboard";
import AddRestaurant from "./components/admin/AddRestaurant";
import AddFoodItem from "./components/admin/AddFoodItem";

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

              {/* user */}
              <Route path="/users/login" element={<Login />} />
              <Route path="/users/signup" element={<Register />} />
              <Route path="/users/me" element={<Profile />} />
              <Route path="/users/me/update" element={<UpdateProfile />} />
              <Route path="/users/forgetPassword" element={<ForgotPassword />} />
              <Route path="/users/resetPassword/:token" element={<NewPassword />} />

              {/* cart */}

              <Route path="/cart" element={<Cart />} />

              {/* order */}
              <Route path="/success" element={<OrderSuccess />} />
              <Route path="/eats/orders/me/myOrders" element={<ListOrders />} />
              <Route path="/eats/orders/:id" element={<OrderDetails />} />
            </Routes>
          </main>
          <Footer />
        </div>
      </Router>
    </>
  );
}

export default App;
