const crypto = require("crypto");
const User = require("./user.model");
const AppError = require("../../core/errors/appError");
const env = require("../../config/env");
const { getStorageProvider } = require("../../providers/storage");
const { getNotificationProvider } = require("../../providers/notification");
const { getCacheProvider } = require("../../providers/cache");

class AuthService {
  async registerUser({ name, email, password, passwordConfirm, phoneNumber, avatar }) {
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      throw new AppError("An account with this email already exists. Please log in instead.", 409);
    }

    let avatarPayload = {
      public_id: "default",
      url: "/images/images.png",
    };

    if (avatar && avatar !== "/images/images.png") {
      const storage = getStorageProvider();
      const uploadResult = await storage.uploadImage(avatar, {
        folder: "avatars",
        width: 150,
        crop: "scale",
      });
      avatarPayload = {
        public_id: uploadResult.publicId,
        url: uploadResult.url,
      };
    }

    const user = await User.create({
      name,
      email,
      password,
      passwordConfirm,
      phoneNumber,
      role: "user", // Public registration is strictly role: user
      avatar: avatarPayload,
    });

    return user;
  }

  async loginUser({ email, password }) {
    if (!email || !password) {
      throw new AppError("Please enter email & password", 400);
    }

    const user = await User.findOne({ email }).select("+password");
    if (!user) {
      throw new AppError("Invalid Email or Password", 401);
    }

    const isMatch = await user.correctPassword(password, user.password);
    if (!isMatch) {
      throw new AppError("Invalid Email or Password", 401);
    }

    return user;
  }

  async forgotPassword(email, frontendBaseUrl) {
    const user = await User.findOne({ email });
    if (!user) {
      throw new AppError("There is no user with that email address.", 404);
    }

    const resetToken = user.createPasswordResetToken();
    await user.save({ validateBeforeSave: false }); // Save without running validators, allowing us to save the reset token and expiration without requiring all fields to be valid.

    const baseUrl = (frontendBaseUrl || env.frontendUrl || "http://localhost:5173").replace(/\/$/, "");
    const resetUrl = `${baseUrl}/users/resetPassword/${resetToken}`;

    try {
      const notifier = getNotificationProvider();
      await notifier.sendPasswordReset(user, resetUrl);
      return { success: true, message: "Token sent to email!" };
    } catch (err) {
      console.error("[ForgotPassword Error] Email delivery failed:", err?.message || err);
      user.passwordResetToken = undefined;
      user.passwordResetExpires = undefined;
      await user.save({ validateBeforeSave: false });
      throw new AppError("There was an error sending the email. Try again later!", 500);
    }
  }


  async resetPassword(token, password, passwordConfirm) {
    const hashedToken = crypto.createHash("sha256").update(token).digest("hex");

    const user = await User.findOne({
      passwordResetToken: hashedToken,
      passwordResetExpires: { $gt: Date.now() }, // Check if token is still valid
    });

    if (!user) {
      throw new AppError("Token is invalid or has expired", 400);
    }

    user.password = password;
    user.passwordConfirm = passwordConfirm;
    user.passwordResetToken = undefined;
    user.passwordResetExpires = undefined;
    await user.save();

    await getCacheProvider().del(`user:session:${user._id}`);

    return user;
  }

  async updatePassword(userId, currentPassword, newPassword, newPasswordConfirm) {
    const user = await User.findById(userId).select("+password");

    const isMatch = await user.correctPassword(currentPassword, user.password);
    if (!isMatch) {
      throw new AppError("Your current password is wrong.", 401);
    }

    user.password = newPassword;
    user.passwordConfirm = newPasswordConfirm;
    await user.save();

    await getCacheProvider().del(`user:session:${userId}`);

    return user;
  }

  async updateProfile(userId, { name, email, avatar }) {
    const newUserData = {};
    if (name) newUserData.name = name;
    if (email) newUserData.email = email;

    if (avatar !== undefined && avatar !== "") {
      const storage = getStorageProvider();
      const uploadResult = await storage.uploadImage(avatar, {
        folder: "avatars",
        width: 150,
        crop: "scale",
      });
      newUserData.avatar = {
        public_id: uploadResult.publicId,
        url: uploadResult.url,
      };
    }

    const user = await User.findByIdAndUpdate(userId, newUserData, {
      new: true,
      runValidators: true,
    });

    await getCacheProvider().del(`user:session:${userId}`);

    return user;
  }
}

module.exports = new AuthService();
