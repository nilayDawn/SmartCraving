const nodemailer = require("nodemailer");
const pug = require("pug");
const htmlToText = require("html-to-text");

const port = Number(process.env.EMAIL_PORT || 465);

const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST || "smtp.gmail.com",
  port: port,
  secure: port === 465,
  connectionTimeout: 10000,
  greetingTimeout: 10000,
  socketTimeout: 15000,
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
    this.from = process.env.EMAIL_FROM || process.env.EMAIL_USERNAME;
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
