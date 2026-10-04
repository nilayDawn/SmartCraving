/* eslint-disable no-unused-vars */
/**
 * Abstract Storage Provider Interface
 * All media storage adapters (Cloudinary, AWS S3, Google Cloud Storage, Local) must adhere to this.
 */
class StorageProviderInterface {
  async uploadImage(imageSource, options = {}) {
    throw new Error("Method uploadImage() must be implemented.");
  }
}

module.exports = StorageProviderInterface;
