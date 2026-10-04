const cloudinary = require("cloudinary").v2;
const StorageProviderInterface = require("./storage.interface");
const env = require("../../config/env");
const { default: logger } = require("../../core/utils/logger");

class CloudinaryProvider extends StorageProviderInterface {
  constructor() {
    super();
    cloudinary.config({
      cloud_name: env.cloudinary.cloudName,
      api_key: env.cloudinary.apiKey,
      api_secret: env.cloudinary.apiSecret,
    });
    this.cloudinary = cloudinary;
  }

  async uploadImage(imageSource, options = {}) {
    if (!imageSource) {
      throw new Error("No image source provided for upload");
    }

    // If it's already an http/https URL, no need to re-upload unless forced
    if (typeof imageSource === "string" && /^https?:\/\//i.test(imageSource)) {
      return {
        publicId: options.publicId || `external_${Date.now()}`,
        url: imageSource,
      };
    }

    try {
      const uploadOptions = {
        folder: options.folder || "food_project",
        ...(options.width ? { width: options.width, crop: options.crop || "scale" } : {}),
      };

      const result = await this.cloudinary.uploader.upload(imageSource, uploadOptions);
      return {
        publicId: result.public_id,
        url: result.secure_url,
      };
    } catch (error) {
      logger.warn(`[Cloudinary Warning] Upload failed, falling back to original: ${error.message}`);
      return {
        publicId: options.fallbackPublicId || `fallback_${Date.now()}`,
        url: imageSource,
      };
    }
  }
}

module.exports = CloudinaryProvider;
