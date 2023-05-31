const express = require('express')
const router = express.Router()
const {checkAuth, checkVerify, checkNotAuth} = require("../handlers/authVerify")
const users = require("../models/users");
const config = require("../config.json")
const logger = require("../handlers/logger")
const bcrypt = require("bcrypt")
const fs = require("fs")
const sanitize = require("sanitize-filename")
const lang = require("../lang/default.json")

router.get("/", checkNotAuth, function (req, res) {
  res.render(__dirname + "/../views/register.ejs", { cloudname: config.cloudname, csrfToken: req.csrfToken(), lang: lang, RCAPTCHA_SITE_KEY: process.env.RCAPTCHA_SITE_KEY})
})

router.post("/", checkNotAuth, async function (req, res) {
    try {
      if (config.disableRegister) {
        res.render(__dirname + "/../views/message.ejs", { message: `<span class="material-icons">cancel</span>&nbsp;${lang["Reg-Disabled"]}`,  cloudname: config.cloudname, lang: lang})
      } else if (req.body.password.length < 8) {
        res.render(__dirname + "/../views/message.ejs", { message: `<span class="material-icons">no_accounts</span>&nbsp;${lang["Pass-8-Characters"]}`,  cloudname: config.cloudname, lang: lang})
      } else {
        const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
        const hashedPassword = await bcrypt.hash(req.body.password, 10)
        const usernameExist = await users.findOne({ username: req.body.name})
        const emailExist = await users.findOne({ email: req.body.email})
        const ipExist = await users.findOne({ip: ip})
        if (usernameExist) {
          res.render(__dirname + "/../views/message.ejs", { message: `<span class="material-icons">no_accounts</span>&nbsp;${lang["Username-Exist"]}`,  cloudname: config.cloudname, lang: lang})
        } else if (emailExist) { 
          res.render(__dirname + "/../views/message.ejs", { message: `<span class="material-icons">cancel_schedule_send</span>&nbsp;${lang["Email-Exist"]}`,  cloudname: config.cloudname, lang: lang})
        } else  if (ipExist && config.registerip) { 
          res.render(__dirname + "/../views/message.ejs", { message: `<span class="material-icons">no_accounts</span>&nbsp;${lang["IP-Exist"]}`,  cloudname: config.cloudname, lang: lang})
        } else {
          const datevar = new Date()
          const day = datevar.getDate()
          const month = datevar.getMonth() + 1
          const year = datevar.getFullYear()
          const date = `${day}.${month}.${year}`
          const lastSeen = (Date.now() / 1000).toString()
          if (config.registerip) {
          const user = new users({
          username: req.body.name,
          email: req.body.email,
          password: hashedPassword,
          id: Date.now().toString(),
          files: [],
          isVerified: false,
          verifyCode: null,
          sharedFiles: [],
          usedStorage: 0,
          role: "user",
          ip: ip,
          createdAt: date,
          lastSeen: lastSeen
        })
        user.save()
      } else {
        const user = new users({
          username: req.body.name,
          email: req.body.email,
          password: hashedPassword,
          id: Date.now().toString(),
          files: [],
          isVerified: false,
          verifyCode: null,
          sharedFiles: [],
          usedStorage: 0,
          role: "user",
          createdAt: date,
          lastSeen: lastSeen
        })
        user.save()
      }
        fs.mkdirSync(__dirname + "/../uploads/" + sanitize(req.body.name))
        logger.logInfo(`User ${req.body.name} has been registered!`)
        res.redirect("/login")
      }
    }
      } catch (err) {
        logger.logError(`There is an error with registration: ${err}`)
        res.redirect("/register")
      }
})

module.exports = router
