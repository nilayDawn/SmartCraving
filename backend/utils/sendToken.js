const jwt = require("jsonwebtoken");

const sendToken = (user, statusCode, res) => {

  const token = user.getJWTToken();

  const cookieDays = Number(process.env.JWT_COOKIE_EXPIRES_DAYS || 7);
  const isProduction = process.env.NODE_ENV?.toUpperCase() === "PRODUCTION";
  const cookieOptions = {
    maxAge: cookieDays * 24 * 60 * 60 * 1000,
    httpOnly: true,
    secure: isProduction,
    sameSite: isProduction ? "none" : "lax",
    path: "/",
  };

  res.cookie("jwt", token, cookieOptions);

  user.password = undefined;

  res.status(statusCode).json({
    success: true,
    token,
    data: { user },
  });
};

module.exports = sendToken;
