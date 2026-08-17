const nodemailer = require("nodemailer");
const pug = require("pug");
const htmlToText = require("html-to-text");

const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST || "smtp.gmail.com",
  port: Number(process.env.EMAIL_PORT || 587),
  secure: Number(process.env.EMAIL_PORT || 587) === 465,
  auth: {
    user: process.env.EMAIL_USERNAME,
    pass: process.env.EMAIL_PASSWORD,
  },
});

module.exports = class Email {
  constructor(user, url) {
    this.to = user.email;
    this.firstName = user.name.split(" ")[0];
    this.url = url;
    this.from = process.env.EMAIL_FROM;
  }

  async send(template, subject) {
    const html = pug.renderFile(`${__dirname}/../view/${template}.pug`, {
      firstName: this.firstName,
      url: this.url,
      subject,
    });

    await transporter.sendMail({
      from: this.from,
      to: this.to,
      subject,
      html,
      text: htmlToText.convert(html),
    });
  }

  async sendWelcome() {
    await this.send("welcome", "Welcome to SmartCraving!");
  }

  async sendPasswordReset() {
    await this.send(
      "passwordReset",
      "password reset token (valid for only 10 minutes)"
    );
  }
};

// mail traps for development
//  this service, you can fake to send emails to clients, but these emails will then never reach these clients, and instead be trapped in your Mailtrap,
// And so that way you cannot accidentally send some development emails to all of your clients or users,

// webside used for dealing emails
// SendGrid provides an SMTP service that allows you to deliver your email via its servers instead of  own client or server
// Make up any email address @mailsac.com and you can instantly receive mail. No need to create the email first! Everything is public, unless you create an account.
