const Stripe = require("stripe");
const PaymentProviderInterface = require("./payment.interface");
const env = require("../../config/env");

class StripeProvider extends PaymentProviderInterface {
  constructor() {
    super();
    this.stripe = new Stripe(env.stripe.secretKey);
    this.webhookSecret = env.stripe.webhookSecret;
    this.publishableKey = env.stripe.publishableKey;
  }

  async createCheckoutSession({ user, lineItems, couponDiscount, successUrl, cancelUrl }) {
    let stripeDiscount;

    if (couponDiscount && couponDiscount.amountOff > 0) {
      stripeDiscount = await this.stripe.coupons.create({
        name: couponDiscount.code || "DISCOUNT",
        amount_off: Math.round(couponDiscount.amountOff * 100),
        currency: "inr",
        duration: "once",
      });
    }

    const session = await this.stripe.checkout.sessions.create({
      customer_email: user.email,
      phone_number_collection: {
        enabled: true,
      },
      line_items: lineItems,
      mode: "payment",
      shipping_address_collection: {
        allowed_countries: ["US", "IN"],
      },
      shipping_options: [
        {
          shipping_rate_data: {
            display_name: "Delivery Charges",
            type: "fixed_amount",
            fixed_amount: {
              amount: 5500, // 55.00 INR
              currency: "inr",
            },
            delivery_estimate: {
              minimum: { unit: "hour", value: 1 },
              maximum: { unit: "hour", value: 3 },
            },
          },
        },
      ],
      ...(stripeDiscount ? { discounts: [{ coupon: stripeDiscount.id }] } : {}),
      success_url: successUrl,
      cancel_url: cancelUrl,
    });

    return session;
  }

  async retrieveSession(sessionId) {
    return this.stripe.checkout.sessions.retrieve(sessionId, {
      expand: ["customer"],
    });
  }

  constructWebhookEvent(rawBody, signature) {
    if (!this.webhookSecret) {
      throw new Error("Stripe webhook secret is not configured");
    }
    return this.stripe.webhooks.constructEvent(rawBody, signature, this.webhookSecret);
  }

  getPublishableKey() {
    return this.publishableKey;
  }
}

module.exports = StripeProvider;
