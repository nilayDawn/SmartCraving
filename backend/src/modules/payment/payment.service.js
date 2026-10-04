const Cart = require("../cart/cart.model");
const promotionService = require("../promotion/promotion.service");
const orderService = require("../order/order.service");
const User = require("../auth/user.model");
const AppError = require("../../core/errors/appError");
const { getPaymentProvider } = require("../../providers/payment");
const env = require("../../config/env");

class PaymentService {
  async processPayment({ user, couponCode }) {
    const cart = await Cart.findOne({ user: user._id })
      .populate({ path: "items.foodItem", select: "name price images stock" })
      .populate({ path: "restaurant", select: "name" });

    if (!cart || !cart.items.length) {
      throw new AppError("Your cart is empty", 400);
    }
    // reduce() function to calculate subtotal, also checks for invalid food items and stock issues
    const subtotal = cart.items.reduce((sum, item) => {
      if (!item.foodItem || !Number.isFinite(Number(item.foodItem.price))) {
        throw new AppError("Cart contains an invalid food item", 400);
      }
      if (
        !Number.isInteger(item.quantity) ||
        item.quantity < 1 ||
        item.quantity > item.foodItem.stock
      ) {
        throw new AppError(`Insufficient stock for ${item.foodItem.name}`, 400);
      }
      return sum + Number(item.foodItem.price) * item.quantity;
    }, 0);

    let couponDiscount = null;
    if (couponCode) {
      const validatedCoupon = await promotionService.validateCoupon(couponCode, subtotal);
      couponDiscount = {
        code: validatedCoupon.couponName,
        amountOff: validatedCoupon.discount,
      };
    }

    const lineItems = cart.items.map((item) => {
      const imageUrl = item.foodItem.images?.[0]?.url;
      const productData = { name: item.foodItem.name };
      // If the image URL is valid, include it in the product data
      if (/^https?:\/\//i.test(imageUrl || "")) {
        productData.images = [imageUrl];
      }

      return {
        price_data: {
          currency: "inr",
          product_data: productData,
          unit_amount: Math.round(Number(item.foodItem.price) * 100), // Original price in INR, converted to paise because Stripe expects amounts in the smallest currency unit
        },
        quantity: item.quantity,
      };
    });

    const paymentProvider = getPaymentProvider();
    const session = await paymentProvider.createCheckoutSession({
      user,
      lineItems,
      couponDiscount,
      successUrl: `${env.frontendUrl}/success?session_id={CHECKOUT_SESSION_ID}`, // Redirect to success page with session ID for verification
      cancelUrl: `${env.frontendUrl}/cart`, // Redirect to cart page on cancellation
    });

    return { url: session.url };
  }

  async handleWebhook(rawBody, signature) {
    const paymentProvider = getPaymentProvider();
    const event = paymentProvider.constructWebhookEvent(rawBody, signature);

    //checks if the event type is either "checkout.session.completed" or "checkout.session.async_payment_succeeded". If not, it returns early, indicating that the event was received but ignored. This is important to avoid processing irrelevant events and ensures that only successful payment events are handled.
    if (
      !["checkout.session.completed", "checkout.session.async_payment_succeeded"].includes(
        event.type,
      )
    ) {
      return { received: true, ignored: true };
    }

    const session = await paymentProvider.retrieveSession(event.data.object.id);
    if (session.payment_status !== "paid") {
      return { received: true, ignored: "payment_not_paid" };
    }

    const sessionEmail = session.customer_details?.email || session.customer_email;
    const user = sessionEmail ? await User.findOne({ email: sessionEmail.toLowerCase() }) : null;

    if (!user) {
      throw new AppError("No customer account matches this checkout session", 400);
    }

    await orderService.finalizePaidOrder({ session, user });
    return { received: true };
  }

  getPublishableKey() {
    return getPaymentProvider().getPublishableKey();
  }
}

module.exports = new PaymentService();
