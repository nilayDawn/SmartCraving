const StripeProvider = require("./stripe.provider");

// Singleton instance of the payment provider
let paymentProviderInstance = null;

const getPaymentProvider = () => {
  if (!paymentProviderInstance) {
    paymentProviderInstance = new StripeProvider();
  }
  return paymentProviderInstance;
};

module.exports = {
  getPaymentProvider,
};
