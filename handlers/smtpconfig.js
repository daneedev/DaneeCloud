const nodemailer = require("nodemailer")

const transporter = nodemailer.createTransport({
    host: process.env.smtp_host,
    port: parseInt(process.env.smtp_port),
    auth: {
      user: process.env.smtp_username,
      pass: process.env.smtp_password
    }
  })

module.exports.transporter = transporter