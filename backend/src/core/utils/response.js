const env = require("../../config/env");

const sendSuccess = (res, statusCode = 200, data = {}, message = "") => {
  const responsePayload = {
    success: true,
    ...(message ? { message } : {}),
    ...(typeof data === "object" && !Array.isArray(data) ? data :   { data }),
  };

  return res.status(statusCode).json(responsePayload);
};


const sendTokenResponse = (user, statusCode, res) => {
  const token = user.getJWTToken();

  const cookieDays = env.jwt.cookieExpiresInDays;
  const cookieOptions = {
    maxAge: cookieDays * 24 * 60 * 60 * 1000,  // in milliseconds
    httpOnly: true,   // prevents client-side JS from accessing the cookie
    secure: env.isProduction,  //prevents sending the cookei over palintext HTTP, only over HTTPS, prevents man-in-the-middle attacks
    sameSite: env.isProduction ? "none" : "lax",  // prevents CSRF attacks, "none" allows cross-site cookies in production
    path: "/",    // cookie will be set for all routes
  };

  res.cookie("jwt", token, cookieOptions);
  user.password = undefined;

  return res.status(statusCode).json({
    success: true,
    token,
    data: { user },
  });
};

module.exports = {
  sendSuccess,
  sendTokenResponse,
};
