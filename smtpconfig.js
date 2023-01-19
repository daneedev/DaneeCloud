const nodemailer = require("nodemailer")

const transporter = nodemailer.createTransport({
    host: process.env.smtp_host,
    port: 587,
    auth: {
      user: process.env.smtp_username,
      pass: process.env.smtp_password
    }
  })

module.exports.transporter = transporter