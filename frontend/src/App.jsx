import React, { useEffect } from "react";
import { BrowserRouter as Router } from "react-router-dom";
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

import Header from "./components/layout/Header";
import Footer from "./components/layout/Footer";
import AppRoutes from "./routes/AppRoutes";
import store from "./redux/store";
import { loadUser } from "./redux/actions/userActions";

function App() {
  useEffect(() => {
    store.dispatch(loadUser());
  }, []);

  return (
    <>
      <ToastContainer position="top-right" autoClose={4000} limit={3} />
      <Router>
        <div className="min-h-screen bg-slate-50 text-slate-900">
          <Header />
          <main className="mx-auto min-h-[calc(100vh-10rem)] w-full max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
            <AppRoutes />
          </main>
          <Footer />
        </div>
      </Router>
    </>
  );
}

export default App;
