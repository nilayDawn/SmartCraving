import React, { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import api from "../../utils/api";

const NewPassword = () => {
  const { token } = useParams();
  const navigate = useNavigate();

  const [password, setPassword] = useState("");
  const [passwordConfirm, setPasswordConfirm] = useState("");
  const [loading, setLoading] = useState(false);

  const submitHandler = async (e) => {
    e.preventDefault();
    if (password !== passwordConfirm) {
      toast.error("Passwords do not match.");
      return;
    }
    try {
      setLoading(true);
      await api.patch(`/v1/users/resetPassword/${token}`, {
        password,
        passwordConfirm,
      });
      toast.success("Password reset successfully! Please log in.");
      navigate("/users/login");
    } catch (error) {
      toast.error(
        error.response?.data?.message || "Token is invalid or has expired."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="row wrapper">
      <div className="col-10 col-lg-5">
        <form className="shadow-lg" onSubmit={submitHandler}>
          <h1 className="mb-3">New Password</h1>
          <div className="form-group">
            <label htmlFor="password_field">New Password</label>
            <input
              type="password"
              id="password_field"
              className="form-control"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
            />
          </div>
          <div className="form-group">
            <label htmlFor="confirm_password_field">Confirm Password</label>
            <input
              type="password"
              id="confirm_password_field"
              className="form-control"
              value={passwordConfirm}
              onChange={(e) => setPasswordConfirm(e.target.value)}
              required
              minLength={6}
            />
          </div>
          <button
            className="btn btn-block py-3"
            type="submit"
            disabled={loading}
          >
            {loading ? "Resetting..." : "Set New Password"}
          </button>
        </form>
      </div>
    </div>
  );
};

export default NewPassword;
