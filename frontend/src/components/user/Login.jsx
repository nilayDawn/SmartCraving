import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import Loader from "../layout/Loader";

import { useDispatch, useSelector } from "react-redux";
import { login } from "../../redux/actions/userActions";
import { clearErrors } from "../../redux/slices/userSlice";

import { toast } from "react-toastify";

const Login = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const dispatch = useDispatch();
  const navigate = useNavigate();

  const { isAuthenticated, loading, error } = useSelector(
    (state) => state.user
  );

  useEffect(() => {
    // Only handle success/toast if user actively submitted the login form
    if (isSubmitting && isAuthenticated) {
      toast.success("Login successful");
      setIsSubmitting(false);
      navigate("/");
    }

    if (isSubmitting && error) {
      toast.error(error);
      dispatch(clearErrors());
      setIsSubmitting(false);
    }
  }, [dispatch, isAuthenticated, error, isSubmitting, navigate]);

  const submitHandler = (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    dispatch(login(email, password));
  };

  return (
    <>
      {loading && isSubmitting ? (
        <Loader />
      ) : (
        <div className="row wrapper">
          <div className="col-10 col-lg-5">
            <form className="shadow-lg" onSubmit={submitHandler}>
              <h1 className="mb-3">Login</h1>

              <div className="form-group">
                <label htmlFor="email_field">Email</label>
                <input
                  type="email"
                  id="email_field"
                  className="form-control"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>

              <div className="form-group">
                <label htmlFor="password_field">Password</label>
                <input
                  type="password"
                  id="password_field"
                  className="form-control"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>

              <Link to="/users/forgetPassword" className="float-right mb-4">
                Forgot Password
              </Link>

              <button type="submit" className="btn btn-block py-3">
                LOGIN
              </button>

              <Link to="/users/signup" className="float-right mt-3">
                NEW USER?
              </Link>
            </form>
          </div>
        </div>
      )}
    </>
  );
};

export default Login;
