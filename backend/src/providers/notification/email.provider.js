const path = require("path");
const nodemailer = require("nodemailer");
const pug = require("pug");
const htmlToText = require("html-to-text");
const NotificationProviderInterface = require("./notification.interface");
const env = require("../../config/env");

class EmailProvider extends NotificationProviderInterface {
  constructor() {
    super();
    this.port = env.email.port || 465;

    const isGmail =
      (env.email.host && env.email.host.toLowerCase().includes("gmail")) ||
      (env.email.service && env.email.service.toLowerCase() === "gmail") ||
      (env.email.username && env.email.username.toLowerCase().includes("@gmail.com"));

    // Using service: "gmail" or port 465 SSL avoids port 587 STARTTLS timeouts on cloud platforms like Render
    const transportConfig = isGmail
      ? {
          service: "gmail",
          auth: {
            user: env.email.username,
            pass: env.email.password,
          },
          tls: {
            rejectUnauthorized: false,
          },
        }
      : {
          host: env.email.host,
          port: this.port,
          secure: this.port === 465,
          connectionTimeout: 10000,
          greetingTimeout: 10000,
          socketTimeout: 15000,
          auth: {
            user: env.email.username,
            pass: env.email.password,
          },
          tls: {
            rejectUnauthorized: false,
          },
        };

    this.transporter = nodemailer.createTransport(transportConfig);
    this.from = env.email.from;
  }

  async sendTemplateEmail({ to, subject, templateName, context }) {
    try {
      const templatePath = path.resolve(__dirname, `../../templates/emails/${templateName}.pug`);
      const html = pug.renderFile(templatePath, {
        ...context,
        subject,
      });

      const mailOptions = {
        from: this.from,
        to,
        subject,
        html,
        text: htmlToText.convert(html),
      };

      return await this.transporter.sendMail(mailOptions);
    } catch (err) {
      console.error(`[EmailProvider Error] Failed sending ${templateName} to ${to}:`, err);
      throw err;
    }
  }


  async sendPasswordReset(user, resetUrl) {
    const firstName = (user.name || "Customer").split(" ")[0];
    return this.sendTemplateEmail({
      to: user.email,
      subject: "Your password reset token (valid for 10 minutes)",
      templateName: "passwordReset",
      context: {
        firstName,
        url: resetUrl,
      },
    });
  }

  async sendWelcome(user, homeUrl) {
    const firstName = (user.name || "Customer").split(" ")[0];
    return this.sendTemplateEmail({
      to: user.email,
      subject: "Welcome to SmartCraving!",
      templateName: "welcome",
      context: {
        firstName,
        url: homeUrl,
      },
    });
  }
}

module.exports = EmailProvider;
