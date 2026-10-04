const cors = require("cors");
const env = require("../../config/env");


const envOrigins = (env.frontendUrl || "")
  .split(",")
  .map((origin) => origin.trim().replace(/\/$/, ""))
  .filter(Boolean);


const defaultOrigins = env.isProduction
  ? envOrigins
  : ["http://localhost:5173", "http://localhost:3000"];



const allowedOrigins = Array.from(new Set([...defaultOrigins]));


const corsOptions = {
  origin: (origin, callback) => {
    // Allow non-browser requests (e.g. server-to-server, health checks, curl)
    if (!origin) return callback(null, true);

    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    }
    return callback(null, false);
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With", "Accept"],
};

module.exports = {
  corsMiddleware: cors(corsOptions),
  corsOptions,
  allowedOrigins,
};
