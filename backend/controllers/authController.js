const User = require("../models/user");
const crypto = require("crypto");
const jwt = require("jsonwebtoken");
const { promisify } = require("util");

const ErrorHandler = require("../utils/errorHandler");
const Email = require("../utils/email");
const catchAsyncErrors = require("../middlewares/catchAsyncErrors");
const sendToken = require("../utils/sendToken");
const cloudinary = require("../config/cloudinary");


// Register user
exports.signup = catchAsyncErrors(async (req, res, next) => {

  const { name, email, password, passwordConfirm, phoneNumber, role } = req.body;

  if (!role || !["user", "admin", "restaurant-owner"].includes(role)) {
    return next(new ErrorHandler("Please select a role (user or admin)", 400));
  }

  let avatar = {};

  // If avatar not provided OR default avatar
  if (!req.body.avatar || req.body.avatar === "/images/images.png") {

    avatar = {
      public_id: "default",
      url: "/images/images.png",
    };

  } else {
    try {
      const result = await cloudinary.uploader.upload(req.body.avatar, {
        folder: "avatars",
        width: 150,
        crop: "scale",
      });

      avatar = {
        public_id: result.public_id,
        url: result.secure_url,
      };
    } catch (err) {
      avatar = {
        public_id: "avatar_" + Date.now(),
        url: req.body.avatar,
      };
    }
  }

  const user = await User.create({
    name,
    email,
    password,
    passwordConfirm,
    phoneNumber,
    role: role || "user",
    avatar,
  });

  sendToken(user, 200, res);

});


// Login
exports.login = catchAsyncErrors(async (req, res, next) => {

  const { email, password } = req.body;

  if (!email || !password) {
    return next(new ErrorHandler("Please enter email & password", 400));
  }

  const user = await User.findOne({ email }).select("+password");

  if (!user) {
    return next(new ErrorHandler("Invalid Email or Password", 401));
  }

  const isPasswordMatched = await user.correctPassword(password, user.password);

  if (!isPasswordMatched) {
    return next(new ErrorHandler("Invalid Email or Password", 401));
  }

  sendToken(user, 200, res);

});


// Protect Route
exports.protect = catchAsyncErrors(async (req, res, next) => {

  let token;

  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith("Bearer")
  ) {
    token = req.headers.authorization.split(" ")[1];
  } 
  else if (req.cookies.jwt) {
    token = req.cookies.jwt;
  }

  if (!token) {
    return next(
      new ErrorHandler(
        "You are not logged in! Please log in to get access.",
        401
      )
    );
  }

  const decoded = await promisify(jwt.verify)(token, process.env.JWT_SECRET);

  const currentUser = await User.findById(decoded.id);

if (!currentUser) {
  return next(
    new ErrorHandler(
      "User no longer exists. Please login again.",
      401
    )
  );
}

  if (currentUser.changedPasswordAfter(decoded.iat)) {

    return next(
      new ErrorHandler(
        "User recently changed password! Please log in again.",
        401
      )
    );
  }

  req.user = currentUser;

  next();
});


// Get profile
exports.getUserProfile = catchAsyncErrors(async (req, res, next) => {

  const user = await User.findById(req.user.id);

  res.status(200).json({
    success: true,
    user,
  });

});


// Update Password
exports.updatePassword = catchAsyncErrors(async (req, res, next) => {

  const { oldPassword, newPassword, newPasswordConfirm } = req.body;

  const user = await User.findById(req.user.id).select("+password");

  const isMatched = await user.correctPassword(oldPassword, user.password);

  if (!isMatched) {
    return next(new ErrorHandler("Old password is incorrect", 400));
  }

  user.password = newPassword;
  user.passwordConfirm = newPasswordConfirm;

  await user.save();

  res.status(200).json({
    success: true,
    message: "Password updated successfully",
  });

});


// Update Profile
exports.updateProfile = catchAsyncErrors(async (req, res, next) => {

  const newUserData = {
    name: req.body.name,
    email: req.body.email,
  };

  if (req.body.avatar !== "") {

    const user = await User.findById(req.user.id);

    const image_id = user.avatar.public_id;

    await cloudinary.uploader.destroy(image_id);

    const result = await cloudinary.uploader.upload(req.body.avatar, {
      folder: "avatars",
      width: 150,
      crop: "scale",
    });

    newUserData.avatar = {
      public_id: result.public_id,
      url: result.secure_url,
    };
  }

  await User.findByIdAndUpdate(req.user.id, newUserData, {
    new: true,
    runValidators: true,
  });

  res.status(200).json({
    success: true,
  });

});


// Forgot Password
exports.forgotPassword = catchAsyncErrors(async (req, res, next) => {

  const email = String(req.body.email || "").trim().toLowerCase();
  const user = await User.findOne({ email });

  if (!user) {
    return res.status(200).json({
      status: "success",
      message: "If an account exists for that email, a reset link has been sent.",
    });
  }

  const resetToken = user.createPasswordResetToken();

  await user.save({ validateBeforeSave: false });

  try {

    const frontendURL = (process.env.FRONTEND_URL || "").trim().replace(/\/+$/, "");

    if (!frontendURL) {
      throw new Error("FRONTEND_URL is not configured");
    }

    const resetURL = `${frontendURL}/users/resetPassword/${resetToken}`;

    await new Email(user, resetURL).sendPasswordReset();

    res.status(200).json({
      status: "success",
      message: "Token sent to email!",
    });

  } catch (err) {

    user.passwordResetToken = undefined;
    user.passwordResetExpires = undefined;

    await user.save({ validateBeforeSave: false });

    return next(
      new ErrorHandler(
        "There was an error sending the email, try again later!",
        500
      )
    );
  }

});


// Reset Password
exports.resetPassword = catchAsyncErrors(async (req, res, next) => {

  const hashedToken = crypto
    .createHash("sha256")
    .update(req.params.token)
    .digest("hex");

  const user = await User.findOne({

    passwordResetToken: hashedToken,
    passwordResetExpires: { $gt: Date.now() },

  });

  if (!user) {
    return next(new ErrorHandler("Token is invalid or has expired", 400));
  }

  user.password = req.body.password;
  user.passwordConfirm = req.body.passwordConfirm;

  user.passwordResetToken = undefined;
  user.passwordResetExpires = undefined;

  await user.save();

  res.status(200).json({
    success: true,
    message: "Password reset successfully. Please log in again.",
  });

});


// Logout
exports.logout = catchAsyncErrors(async (req, res, next) => {

  res.cookie("jwt", null, {
    expires: new Date(Date.now() - 1000),
    httpOnly: true,
  });

  res.status(200).json({
    success: true,
    message: "Logged out",
  });

});
