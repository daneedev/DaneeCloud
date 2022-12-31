const nodemailer = require("nodemailer")

const transporter = nodemailer.createTransport({
    host: "in-v3.mailjet.com",
    port: 587,
    auth: {
      user: process.env.smtp_username,
      pass: process.env.smtp_password
    }
  })

module.exports.transporter = transporter