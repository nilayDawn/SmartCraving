/* eslint-disable no-unused-vars */
/**
 * Abstract Payment Provider Interface
 * All payment gateway adapters (Stripe, Razorpay, PayPal) must adhere to this interface.
 */
class PaymentProviderInterface {
  async createCheckoutSession(params) {
    throw new Error("Method createCheckoutSession() must be implemented.");
  }

  async retrieveSession(sessionId) {
    throw new Error("Method retrieveSession() must be implemented.");
  }

  constructWebhookEvent(rawBody, signature) {
    throw new Error("Method constructWebhookEvent() must be implemented.");
  }

  getPublishableKey() {
    throw new Error("Method getPublishableKey() must be implemented.");
  }
}

module.exports = PaymentProviderInterface;
