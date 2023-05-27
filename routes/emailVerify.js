const express = require('express')
const router = express.Router()
const router2 = express.Router()
const {checkAuth, checkVerify, checkNotVerify} = require("../handlers/authVerify")
const users = require("../models/users");
const config = require("../config.json")
const { transporter} = require("../handlers/smtpconfig")
const logger = require("../handlers/logger")
const lang = require("../lang/default.json")

router.get("/", checkAuth, checkNotVerify, function (req, res) {
    res.render(__dirname + "/../views/verify.ejs", { cloudname: config.cloudname, req: req, csrfToken: req.csrfToken(), lang: lang})
})

router.post("/", checkAuth, checkNotVerify, async function (req, res) {
    const verifycode = Math.floor(Math.random() * 9000) + 1000
    const addverifycode = await users.findOneAndUpdate({username: req.user.username}, {verifyCode: verifycode.toString(), lang: lang}) 
    transporter.sendMail({
    from: {
    name: config.cloudname + " | Verify",
    address: process.env.emailSender
    },
    to: req.user.email,
    subject: "Verify your account",
    text: "Hello,\n please verify your account with this code: " + verifycode.toString() + "\n If you didn't registered on " + config.cloudurl + ", ignore this mail.\nThe code will expire in next 10 minutes.\n\n\nRegards,\nVerification bot from " + config.cloudname
    }, function (error, info) {
    if (error) {
    logger.logError(error)
    } else {
      logger.logInfo("Verification email has been sent to " + req.user.email)
      setTimeout(async () => {
        const removeverifycode = await users.findOneAndUpdate({username: req.user.username}, {verifyCode: null})
      }, 600000);
    }
    })
    res.redirect("/verifycode")
  
})

router2.get("/", checkAuth, checkNotVerify, function (req, res) {
    res.render(__dirname + "/../views/verifycode.ejs", { cloudname: config.cloudname, csrfToken: req.csrfToken(), lang: lang})
})

router2.post("/", checkAuth, checkNotVerify, async function (req, res) {
    const user = await users.findOne({ username: req.user.username})
    if (user.verifyCode == req.body.code) {
      const verifyuser = await users.findOneAndUpdate({username: req.user.username}, { isVerified: true})
      res.render(__dirname + "/../views/message.ejs", { cloudname: config.cloudname, message: `<span class="material-icons">verified</span>&nbsp;${lang["Account-Verified"]}`, lang: lang})
      logger.logInfo("User " + req.user.username + " has been successfully verified!")
    } else {
      res.redirect("/verifycode")
    }
})

module.exports.ver = router
module.exports.verCode = router2