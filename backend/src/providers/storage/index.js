const CloudinaryProvider = require("./cloudinary.provider");

let storageProviderInstance = null;

const getStorageProvider = () => {
  if (!storageProviderInstance) {
    storageProviderInstance = new CloudinaryProvider();
  }
  return storageProviderInstance;
};

module.exports = {
  getStorageProvider,
};
