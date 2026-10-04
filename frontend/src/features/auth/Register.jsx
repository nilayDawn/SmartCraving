import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { register} from "../../redux/actions/userActions";
import { clearErrors } from "../../redux/slices/userSlice";
import { toast } from "react-toastify";
import PasswordInput from "../../components/common/PasswordInput";

const Register = () => {
 
  const [user, setUser] = useState({
    name: "",
    email: "",
    password: "",
    passwordConfirm: "",
    phoneNumber: "",
  });

  const { name, email, password, passwordConfirm, phoneNumber } = user;

  const [avatar, setAvatar] = useState("");
  const [avatarPreview, setAvatarPreview] = useState("/images/images.png");

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const dispatch = useDispatch();
  const navigate = useNavigate();

  const { isAuthenticated, error, loading } = useSelector(
    (state) => state.user
  );

  // Clear stale errors on mount
  useEffect(() => {
    dispatch(clearErrors());
  }, [dispatch]);

  // Handle redirection and error alerts
  useEffect(() => {
    if (isAuthenticated && !isSubmitting) {
      navigate("/");
    }

    if (isSubmitting && isAuthenticated) {
      toast.success("Account created successfully! Welcome to SmartCraving.", {
        toastId: "register-success",
      });
      setIsSubmitting(false);
      navigate("/");
    }

    if (isSubmitting && error) {
      setErrorMessage(error);
      toast.error(error, { toastId: "register-error" });
      dispatch(clearErrors());
      setIsSubmitting(false);
    }
  }, [dispatch, isAuthenticated, error, isSubmitting, navigate]);

  const submitHandler = (e) => {
    e.preventDefault();
    setErrorMessage("");

    if (password !== passwordConfirm) {
      setErrorMessage("Passwords do not match");
      toast.error("Passwords do not match", { toastId: "register-password-mismatch" });
      return;
    }

    const userData = {
      name,
      email,
      password,
      passwordConfirm,
      phoneNumber,
      avatar: avatar === "" ? "/images/images.png" : avatar,
    };

    setIsSubmitting(true);
    dispatch(register(userData)); 
  };

  const onChange = (e) => {
    if (errorMessage) setErrorMessage("");
    if (e.target.name === "avatar") {
      const reader = new FileReader();

      reader.onload = () => {
        if (reader.readyState === 2) {
          setAvatarPreview(reader.result);
          setAvatar(reader.result);
        }
      };
      reader.readAsDataURL(e.target.files[0]);
    } else {
      setUser({ ...user, [e.target.name]: e.target.value });
    }
  };

  return (
    <>
      <div className="row wrapper">
        <div className="col-10 col-lg-5 registration-form">
          <form
            className="shadow-lg"
            onSubmit={submitHandler}
            encType="multipart/form-data"
          >
            <h1 className="mb-3">Register</h1>
            {errorMessage && (
              <div
                className="alert alert-danger py-2 px-3 mb-3 text-sm rounded border border-rose-300 bg-rose-50 text-rose-700"
                role="alert"
              >
                {errorMessage}
              </div>
            )}
            <div className="form-group">
              <label htmlFor="name_field">
                Name <span className="text-rose-500 font-bold">*</span>
              </label>
              <input
                type="text"
                id="name_field"
                className="form-control"
                name="name"
                value={name}
                onChange={onChange}
                required
              ></input>
            </div>
            <div className="form-group">
              <label htmlFor="email_field">
                Email <span className="text-rose-500 font-bold">*</span>
              </label>
              <input
                type="email"
                id="email_field"
                className="form-control"
                name="email"
                value={email}
                onChange={onChange}
                required
              ></input>
            </div>

            <div className="form-group">
              <label htmlFor="password_field">
                Password <span className="text-rose-500 font-bold">*</span>
              </label>
              <PasswordInput
                id="password_field"
                name="password"
                value={password}
                onChange={onChange}
                autoComplete="new-password"
                required
              />
            </div>
            <div className="form-group">
              <label htmlFor="passwordConfirm_field">
                Password Confirm <span className="text-rose-500 font-bold">*</span>
              </label>
              <PasswordInput
                id="passwordConfirm_field"
                name="passwordConfirm"
                value={passwordConfirm}
                onChange={onChange}
                autoComplete="new-password"
                required
              />
            </div>
            <div className="form-group">
              <label htmlFor="phoneNumber_field">
                Phone Number <span className="text-rose-500 font-bold">*</span>
              </label>
              <input
                type="number"
                id="phoneNumber_field"
                className="form-control"
                name="phoneNumber"
                value={phoneNumber}
                onChange={onChange}
                required
              ></input>
            </div>
            <div className="form-group">
              <label htmlFor="avatar_upload">Avatar</label>
              <div className="d-flex align-items-center">
                <div>
                  <figure className="avatar mr-3 item-rtl">
                    <img
                      src={avatarPreview}
                      className="rounded-circle"
                      alt="Avatar Preview"
                    />
                  </figure>
                </div>
                <div className="custom-file">
                  <input
                    type="file"
                    name="avatar"
                    className="custom-file-input"
                    id="customFile"
                    accept="image/*"
                    onChange={onChange}
                  ></input>
                  <label className="custom-file-label" htmlFor="customFile">
                    Choose Avatar
                  </label>
                </div>
              </div>
            </div>

            <button
              id="register_button"
              type="submit"
              className="btn btn-block py-3"
              disabled={loading || isSubmitting}
            >
              {loading || isSubmitting ? "REGISTERING..." : "REGISTER"}
            </button>
          </form>
        </div>
      </div>
    </>
  );
};

export default Register;
