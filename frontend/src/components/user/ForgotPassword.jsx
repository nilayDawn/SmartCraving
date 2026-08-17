import React, { useState } from "react";
import { toast } from "react-toastify";
import api from "../../utils/api";

const ForgotPassword = () => {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);

  const submitHandler = async (e) => {
    e.preventDefault();
    if (!email) {
      toast.error("Please enter your email address.");
      return;
    }
    try {
      setLoading(true);
      await api.post("/v1/users/forgetPassword", { email });
      toast.success("Password reset link sent to your email!");
      setEmail("");
    } catch (error) {
      toast.error(
        error.response?.data?.message || "Failed to send reset email. Try again."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="row wrapper">
      <div className="col-10 col-lg-5">
        <form className="shadow-lg" onSubmit={submitHandler}>
          <h1 className="mb-3">Forgot Password</h1>
          <p className="text-muted mb-4">
            Enter your registered email and we'll send you a password reset link.
          </p>
          <div className="form-group">
            <label htmlFor="email_field">Email Address</label>
            <input
              type="email"
              id="email_field"
              className="form-control"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <button
            className="btn btn-block py-3"
            type="submit"
            disabled={loading}
          >
            {loading ? "Sending..." : "Send Reset Link"}
          </button>
        </form>
      </div>
    </div>
  );
};

export default ForgotPassword;
