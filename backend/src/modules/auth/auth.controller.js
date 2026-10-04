const authService = require("./auth.service");
const catchAsync = require("../../core/errors/catchAsync");
const { sendTokenResponse } = require("../../core/utils/response");
const env = require("../../config/env");

exports.signup = catchAsync(async (req, res, next) => {
  const { name, email, password, passwordConfirm, phoneNumber, avatar } = req.body;
  const user = await authService.registerUser({
    name,
    email,
    password,
    passwordConfirm,
    phoneNumber,
    avatar,
  });

  sendTokenResponse(user, 200, res);
});

exports.login = catchAsync(async (req, res, next) => {
  const { email, password } = req.body;
  const user = await authService.loginUser({ email, password });

  sendTokenResponse(user, 200, res);
});

exports.logout = catchAsync(async (req, res, next) => {
  // Clear the JWT cookie by setting it to a short-lived value
  res.cookie("jwt", "loggedout", {
    maxAge: 10 * 1000,  // 10 seconds
    httpOnly: true,
    secure: env.isProduction,
    sameSite: env.isProduction ? "none" : "lax",
    path: "/",
  });

  res.status(200).json({
    success: true,
    message: "Logged out successfully.",
  });
});

exports.getUserProfile = catchAsync(async (req, res, next) => {
  res.status(200).json({
    success: true,
    user: req.user,
    data: { user: req.user },
  });
});

exports.updateProfile = catchAsync(async (req, res, next) => {
  const { name, email, avatar } = req.body;
  const user = await authService.updateProfile(req.user.id, { name, email, avatar });

  res.status(200).json({
    success: true,
    data: { user },
  });
});

exports.updatePassword = catchAsync(async (req, res, next) => {
  const { passwordCurrent, password, passwordConfirm } = req.body;
  const user = await authService.updatePassword(
    req.user.id,
    passwordCurrent,
    password,
    passwordConfirm,
  );

  sendTokenResponse(user, 200, res);
});

exports.forgotPassword = catchAsync(async (req, res, next) => {
  const clientOrigin = req.get("origin") || req.get("referer");
  let frontendBaseUrl = env.frontendUrl;
  if (clientOrigin) {
    try {
      const parsed = new URL(clientOrigin);
      frontendBaseUrl = `${parsed.protocol}//${parsed.host}`;
    } catch (_) {
      // If parsing fails, fallback to env.frontendUrl
      frontendBaseUrl = env.frontendUrl;
    }
  }

  const result = await authService.forgotPassword(req.body.email, frontendBaseUrl);
  res.status(200).json(result);
});

exports.resetPassword = catchAsync(async (req, res, next) => {
  const user = await authService.resetPassword(
    req.params.token,
    req.body.password,
    req.body.passwordConfirm,
  );

  sendTokenResponse(user, 200, res);
});
