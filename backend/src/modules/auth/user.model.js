const mongoose = require("mongoose");
const validator = require("validator");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const env = require("../../config/env");

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Please enter your name"],
      maxlength: [30, "Name cannot exceed 30 characters"],
    },
    email: {
      type: String,
      required: [true, "Please enter email"],
      unique: true,
      lowercase: true,
      validate: [validator.isEmail, "Enter valid email"],
    },
    password: {
      type: String,
      required: [true, "Enter password"],
      minlength: 6,
      select: false, // prevents password from being returned in normal user.find() queries, only returned when explicitly selected with .select('+password')
    },
    passwordConfirm: {
      type: String,
      required: [true, "Confirm password"],
      validate: {
        validator: function (el) {
          return el === this.password;
        },
        message: "Passwords are not same",
      },
    },
    phoneNumber: {
      type: String,
      required: true,
      match: [/^[0-9]{10}$/, "Enter valid phone number"],
    },
    role: {
      type: String,
      enum: ["user", "restaurant-owner", "admin"],
      default: "user",
    },
    avatar: {
      public_id: String,
      url: String,
    },
    passwordChangedAt: Date,
    passwordResetToken: String,
    passwordResetExpires: Date,
  },
  { timestamps: true },
);

// Hash password before saving
userSchema.pre("save", async function () {
  // if password is not modified, skip hashing
  if (!this.isModified("password")) return ;

  // Set passwordChangedAt only when modifying an existing password (not on creation)
  if (!this.isNew) {
    this.passwordChangedAt = Date.now() - 1000; // subtract 1 second , because sometimes saving to DB can be slower than issuing a token, so we subtract 1 second to ensure the token is invalidated
  }

  this.password = await bcrypt.hash(this.password, 10);
  this.passwordConfirm = undefined;
});

// Compare password
userSchema.methods.correctPassword = async function (candidatePassword, userPassword) {
  return bcrypt.compare(candidatePassword, userPassword);
};

// Check if password changed after token was issued
userSchema.methods.changedPasswordAfter = function (jwtTimestamp) {
  if (this.passwordChangedAt) {
    const changedTimestamp = Math.floor(this.passwordChangedAt.getTime() / 1000);  // Convert to seconds and parse as integer
    return jwtTimestamp < changedTimestamp;  // true if password was changed after token was issued
  }
  return false;
};

// Generate JWT token
userSchema.methods.getJWTToken = function () {
  return jwt.sign({ id: this._id }, env.jwt.secret, {
    expiresIn: env.jwt.expiresIn,
  });
};

// Generate and hash password reset token
userSchema.methods.createPasswordResetToken = function () {
  const resetToken = crypto.randomBytes(32).toString("hex"); // generate a random token of 32 bytes

  this.passwordResetToken = crypto
    .createHash("sha256")
    .update(resetToken)
    .digest("hex");   // hash the token and store it in the database for security

  this.passwordResetExpires = Date.now() + 10 * 60 * 1000; // 10 minutes

  return resetToken;
};

module.exports = mongoose.model("User", userSchema);
