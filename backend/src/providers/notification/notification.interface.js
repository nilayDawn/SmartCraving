/* eslint-disable no-unused-vars */
/**
 * Abstract Notification Provider Interface
 * All notification adapters (Nodemailer, SendGrid, Resend, Twilio) must implement this.
 */
class NotificationProviderInterface {
  async sendEmail(options) {
    throw new Error("Method sendEmail() must be implemented.");
  }

  async sendPasswordReset(user, resetUrl) {
    throw new Error("Method sendPasswordReset() must be implemented.");
  }

  async sendWelcome(user, homeUrl) {
    throw new Error("Method sendWelcome() must be implemented.");
  }
}

module.exports = NotificationProviderInterface;
