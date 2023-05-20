const express = require('express')
const router = express.Router()
const {checkAuth, checkVerify, checkNotAuth} = require("../handlers/authVerify")
const users = require("../models/users");
const config = require("../config.json")
const logger = require("../handlers/logger")
const bcrypt = require("bcrypt")
const fs = require("fs")
const sanitize = require("sanitize-filename")
const moment = require("moment")

router.get("/", checkNotAuth, function (req, res) {
  res.render(__dirname + "/../views/register.ejs", { cloudname: config.cloudname, csrfToken: req.csrfToken()})
})

router.post("/", checkNotAuth, async function (req, res) {
    try {
      if (config.disableRegister) {
        res.render(__dirname + "/../views/message.ejs", { message: `<span class="material-icons">cancel</span>&nbsp;Sorry, registration is disabled.`,  cloudname: config.cloudname})
      } else if (req.body.password.length < 8) {
        res.render(__dirname + "/../views/message.ejs", { message: `<span class="material-icons">no_accounts</span>&nbsp;Password must contains atleast 8 characters.`,  cloudname: config.cloudname})
      } else {
        const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
        const hashedPassword = await bcrypt.hash(req.body.password, 10)
        const usernameExist = await users.findOne({ username: req.body.name})
        const emailExist = await users.findOne({ email: req.body.email})
        const ipExist = await users.findOne({ip: ip})
        if (usernameExist) {
          res.render(__dirname + "/../views/message.ejs", { message: `<span class="material-icons">no_accounts</span>&nbsp;User with this username already exists!`,  cloudname: config.cloudname})
        } else if (emailExist) { 
          res.render(__dirname + "/../views/message.ejs", { message: `<span class="material-icons">cancel_schedule_send</span>&nbsp;User with this email already exists!`,  cloudname: config.cloudname})
        } else  if (ipExist && config.registerip) { 
          res.render(__dirname + "/../views/message.ejs", { message: `<span class="material-icons">no_accounts</span>&nbsp;User with this IP address already exists!`,  cloudname: config.cloudname})
        } else {
          const datevar = new Date()
          const day = datevar.getDate()
          const month = datevar.getMonth() + 1
          const year = datevar.getFullYear()
          const date = `${day}.${month}.${year}`
          const lastSeen = moment.unix(Date.now() / 1000).fromNow()
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
