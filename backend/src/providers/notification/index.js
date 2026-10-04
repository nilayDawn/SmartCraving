const EmailProvider = require("./email.provider");

let notificationProviderInstance = null;

const getNotificationProvider = () => {
  if (!notificationProviderInstance) {
    notificationProviderInstance = new EmailProvider();
  }
  return notificationProviderInstance;
};

module.exports = {
  getNotificationProvider,
};
