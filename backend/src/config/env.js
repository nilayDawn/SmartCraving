const path = require("path");
const dotenv = require("dotenv");

// Load environment configuration once. This file lives in backend/.env.
const envPath = path.resolve(__dirname, "../config/config.env");
const dotenvResult = dotenv.config({ path: envPath });

if (dotenvResult.error && dotenvResult.error.code === "ENOENT") {
  console.warn(`[Config Warning] Environment file not found: ${envPath}`);
}

const isProduction = (process.env.NODE_ENV || "").trim().toUpperCase() === "PRODUCTION";

// Clean quotes and whitespace commonly introduced when pasting into hosting platforms (e.g. Render)
const cleanEnv = (val, fallback = "") => {
  if (val === undefined || val === null) return fallback;
  let str = String(val).trim();
  if (
    (str.startsWith('"') && str.endsWith('"')) ||
    (str.startsWith("'") && str.endsWith("'"))
  ) {
    str = str.slice(1, -1).trim();
  }
  return str || fallback;
};

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

  const missing = requiredProductionEnv.filter((key) => !cleanEnv(process.env[key]));
  if (missing.length > 0) {
    throw new Error(`[Config Error] Missing production environment variables: ${missing.join(", ")}`);
  }
}

const env = {
  port: parseInt(cleanEnv(process.env.PORT), 10) || 4000,
  nodeEnv: cleanEnv(process.env.NODE_ENV, "DEVELOPMENT"),
  isProduction,
  db: {
    uri: cleanEnv(process.env.DB_LOCAL_URI),
  },
  jwt: {
    secret: cleanEnv(process.env.JWT_SECRET, "default_development_secret_do_not_use_in_prod"),
    expiresIn: cleanEnv(process.env.JWT_EXPIRE, "10d"),
    cookieExpiresInDays: parseInt(cleanEnv(process.env.JWT_EXPIRES_TIME), 10) || 10,
  },
  cloudinary: {
    cloudName: cleanEnv(process.env.CLOUDINARY_CLOUD_NAME),
    apiKey: cleanEnv(process.env.CLOUDINARY_API_KEY),
    apiSecret: cleanEnv(process.env.CLOUDINARY_API_SECRET),
  },
  email: {
    host: cleanEnv(process.env.EMAIL_HOST, "smtp.gmail.com"),
    port: parseInt(cleanEnv(process.env.EMAIL_PORT), 10) || 465,
    service: cleanEnv(process.env.EMAIL_SERVICE),
    username: cleanEnv(process.env.EMAIL_USERNAME),
    password: cleanEnv(process.env.EMAIL_PASSWORD),
    from: cleanEnv(process.env.EMAIL_FROM) || cleanEnv(process.env.EMAIL_USERNAME) || "no-reply@smartcraving.com",
  },
  frontendUrl: cleanEnv(process.env.FRONTEND_URL, "http://localhost:5173"),
  stripe: {
    secretKey: cleanEnv(process.env.STRIPE_SECRET_KEY),
    publishableKey: cleanEnv(process.env.STRIPE_API_KEY),
    webhookSecret: cleanEnv(process.env.STRIPE_WEBHOOK_SECRET),
  },
  groq: {
    apiKey: cleanEnv(process.env.GROQ_API_KEY),
    model: cleanEnv(process.env.GROQ_MODEL, "openai/gpt-oss-20b"),
  },
  uvThreadpoolSize: parseInt(cleanEnv(process.env.UV_THREADPOOL_SIZE), 10) || 16,
  cluster: {
    enabled: cleanEnv(process.env.CLUSTER) === "true",
  },
};

module.exports = env;

