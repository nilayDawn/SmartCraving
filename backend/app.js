const express = require("express");
const app = express();
const path = require("path");
const cookieParser = require("cookie-parser");
const bodyParser = require("body-parser");
const fileUpload = require("express-fileupload");
const cors = require("cors");

const aiRoutes = require("./routes/ai.routes");
const errorMiddleware = require("./middlewares/errors");

// Parse explicit frontend URLs. Never allow arbitrary deployment subdomains.
const envOrigins = (process.env.FRONTEND_URL || "")
  .split(",")
  .map((origin) => origin.trim().replace(/\/$/, "")) 
  .filter(Boolean);

const defaultOrigins = process.env.NODE_ENV === "PRODUCTION"
  ? []
  : ["http://localhost:5173", "http://localhost:3000"];

const allowedOrigins = Array.from(new Set([...envOrigins, ...defaultOrigins]));
console.log("Allowed Origins for CORS:", allowedOrigins);

const corsOptions = {
  origin: (origin, callback) => {
    // 1. Allow non-browser requests (Postman, health checks, server-to-server)
    if (!origin) return callback(null, true);

    const isAllowed = allowedOrigins.includes(origin);

    if (isAllowed) {
      return callback(null, true);
    } else {
      // Return false instead of throwing an Error to prevent Express 500 error crashes
      return callback(null, false);
    }
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With", "Accept"],
};

// Apply CORS before body parsers and routes
app.use(cors(corsOptions));
app.options("*", cors(corsOptions));

app.use(express.json({ limit: "50mb" }));
app.use(bodyParser.json({ limit: "50mb" }));
app.use(bodyParser.urlencoded({ extended: true, limit: "50mb" }));
app.use(cookieParser());
app.use(fileUpload());

// Import all routes
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
app.use("/api/v1/users", auth);
app.use("/api/v1", payment);
app.use("/api/v1/coupon", coupon);
app.use("/api/v1/eats/cart", cart);
app.use("/api/v1/ai", aiRoutes);

app.use("/health", (req, res) => {
  res.status(200).json({ status: "success", message: "Server is healthy" });
});

app.set("view engine", "pug");
app.set("views", path.join(__dirname, "views"));

app.all("*", (req, res, next) => {
  res.status(404).json({
    status: "fail",
    message: `Can't find ${req.originalUrl} on this server!`,
  });
});

app.use(errorMiddleware);

module.exports = app;
