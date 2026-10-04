const path = require("path");
const dotenv = require("dotenv");

// Load environment configuration once. This file lives in backend/.env.
const envPath = path.resolve(__dirname, "../config/config.env");
const dotenvResult = dotenv.config({ path: envPath });

if (dotenvResult.error && dotenvResult.error.code === "ENOENT") {
  console.warn(`[Config Warning] Environment file not found: ${envPath}`);
}

const isProduction = process.env.NODE_ENV?.toUpperCase() === "PRODUCTION";

// Production safety validations
if (isProduction) {
  const requiredProductionEnv = [
    "FRONTEND_URL",
    "STRIPE_SECRET_KEY",
    "STRIPE_WEBHOOK_SECRET",
    "EMAIL_HOST",
    "EMAIL_PORT",
    "EMAIL_USERNAME",
    "EMAIL_PASSWORD",
    "EMAIL_FROM",
  ];

  const missing = requiredProductionEnv.filter((key) => !process.env[key] || !process.env[key].trim());
  if (missing.length > 0) {
    throw new Error(`[Config Error] Missing production environment variables: ${missing.join(", ")}`);
  }
}

const env = {
  port: parseInt(process.env.PORT, 10) || 4000,
  nodeEnv: process.env.NODE_ENV || "DEVELOPMENT",
  isProduction,
  db: {
    uri: process.env.DB_LOCAL_URI ,
  },
  jwt: {
    secret: process.env.JWT_SECRET || "default_development_secret_do_not_use_in_prod",
    expiresIn: process.env.JWT_EXPIRE || "10d",
    cookieExpiresInDays: parseInt(process.env.JWT_EXPIRES_TIME, 10) || 10,
  },
  cloudinary: {
    cloudName: process.env.CLOUDINARY_CLOUD_NAME || "",
    apiKey: process.env.CLOUDINARY_API_KEY || "",
    apiSecret: process.env.CLOUDINARY_API_SECRET || "",
  },
  email: {
    host: process.env.EMAIL_HOST || "smtp.gmail.com",
    port: parseInt(process.env.EMAIL_PORT, 10) || 587,
    username: process.env.EMAIL_USERNAME || "",
    password: process.env.EMAIL_PASSWORD || "",
    from: process.env.EMAIL_FROM || process.env.EMAIL_USERNAME || "no-reply@smartcraving.com",
  },
  frontendUrl: process.env.FRONTEND_URL || "http://localhost:5173",
  stripe: {
    secretKey: process.env.STRIPE_SECRET_KEY || "",
    publishableKey: process.env.STRIPE_API_KEY || "",
    webhookSecret: process.env.STRIPE_WEBHOOK_SECRET || "",
  },
  groq: {
    apiKey: (process.env.GROQ_API_KEY || "").trim(),
    model: process.env.GROQ_MODEL || "openai/gpt-oss-20b",
  },
};

module.exports = env;
