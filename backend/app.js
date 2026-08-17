const express = require("express");
const app = express();
const path = require("path");
const cookieParser = require("cookie-parser");
const bodyParser = require("body-parser");
// const cloudinary = require("cloudinary");
const fileUpload = require("express-fileupload");
const cors = require("cors");

const aiRoutes = require("./routes/ai.routes");

const errorMiddleware = require("./middlewares/errors");

const allowedOrigins = (process.env.FRONTEND_URL || "http://localhost:5173")
  .split(",").map((origin) => origin.trim()).filter(Boolean);
console.log("Allowed Origins for CORS:", allowedOrigins);
app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) return callback(null, true);
    return callback(new Error("Origin is not allowed by CORS"));
  },
  credentials: true,
}));
app.use(express.json({ limit: "50mb" }));
app.use(bodyParser.json({ limit: "50mb" }));
app.use(bodyParser.urlencoded({ extended: true, limit: "50mb" }));
app.use(cookieParser());
app.use(fileUpload());

//Setting Up Cloudinary Configuration
// cloudinary.config({
//   cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
//   api_key: process.env.CLOUDINARY_API_KEY,
//   api_secret: process.env.CLOUDINARY_API_SECRET,
// });
// Stripe proxy removed — `request` module was not imported and caused a ReferenceError

//Import all routes
const foodRouter = require("./routes/foodItem");
const restaurant = require("./routes/restaurant");
const menuRouter = require("./routes/menu");
const coupon = require("./routes/couponRoutes");

const order = require("./routes/order");
const auth = require("./routes/auth");
const payment = require("./routes/payment");
const cart = require("./routes/cart");
const restaurantCount = require("./routes/restaurant_count");

app.use("/api/v1/eats", foodRouter);
app.use("/api/v1/eats/menus", menuRouter);
app.use("/api/v1/eats/stores", restaurant);
app.use("/api/v1/eats/restaurants", restaurantCount);
app.use("/api/v1/eats/orders", order);
// app.use("/api/v1/reviews", review);
app.use("/api/v1/users", auth);
app.use("/api/v1", payment);
app.use("/api/v1/coupon", coupon);
app.use("/api/v1/eats/cart", cart);

app.use("/api/v1/ai", aiRoutes);

//----------------------------------------------------

app.set("view engine", "pug");
app.set("views", path.join(__dirname, "views"));
//--------------------------------------------------
app.all("*", (req, res, next) => {
  res.status(404).json({
    status: "fail",
    message: `Can't find ${req.originalUrl} on this server !`,
  });
});

app.use(errorMiddleware);

module.exports = app;
