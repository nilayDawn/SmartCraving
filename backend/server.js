// SmartCraving - An AI-Powered Food Ordering and Restaurant Intelligence Platform
// Copyright (C) 2026  Nilay Dawn

// This program is free software: you can redistribute it and/or modify
// it under the terms of the GNU General Public License as published by
// the Free Software Foundation, either version 3 of the License, or
// (at your option) any later version.

// This program is distributed in the hope that it will be useful,
// but WITHOUT ANY WARRANTY; without even the implied warranty of
// MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
// GNU General Public License for more details.

// You should have received a copy of the GNU General Public License
// along with this program. If not, see <https://www.gnu.org/licenses/>.

const dotenv = require("dotenv");
dotenv.config({ path: "./config/config.env" });

if (process.env.NODE_ENV?.toUpperCase() === "PRODUCTION") {
  const requiredProductionEnv = ["FRONTEND_URL", "STRIPE_SECRET_KEY", "STRIPE_WEBHOOK_SECRET"];
  const missingProductionEnv = requiredProductionEnv.filter(
    (name) => !process.env[name] || !process.env[name].trim()
  );

  const smtpVariables = [
    "EMAIL_HOST",
    "EMAIL_PORT",
    "EMAIL_USERNAME",
    "EMAIL_PASSWORD",
    "EMAIL_FROM",
  ];
  const hasSmtpConfig = smtpVariables.every(
    (name) => process.env[name] && process.env[name].trim()
  );
  const hasResendConfig = Boolean(process.env.RESEND_API_KEY?.trim());

  if (!hasSmtpConfig && !hasResendConfig) {
    missingProductionEnv.push(
      "RESEND_API_KEY (or complete EMAIL_HOST/EMAIL_PORT/EMAIL_USERNAME/EMAIL_PASSWORD/EMAIL_FROM)"
    );
  }

  if (missingProductionEnv.length) {
    throw new Error(
      `Missing production environment variables: ${missingProductionEnv.join(", ")}`
    );
  }

}

const app = require("./app");
const connectDatabase = require("./config/database");
const cloudinary = require("cloudinary");

//Handle Uncaught exceptions
process.on("uncaughtException", (err) => {
  console.log(`ERROR: ${err.stack}`);
  console.log("Shutting down server due to uncaught exception");
  process.exit(1);
});

//setting up config file — dotenv already configured at the top

//connecting to database
connectDatabase();

// Setting up cloudinary configuration
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const server = app.listen(process.env.PORT, () => {
  console.log(
    `Server started on PORT: ${process.env.PORT} in ${process.env.NODE_ENV} mode.`
  );
});

//Handle Unhandled Promise rejections
process.on("unhandledRejection", (err) => {
  console.log(`ERROR: ${err.message}`);
  console.log("Shutting down the server due to Unhandled Promise rejection");
  server.close(() => {
    process.exit(1);
  });
});
