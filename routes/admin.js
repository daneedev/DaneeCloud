const express = require('express')
const router = express.Router()
const router2 = express.Router()
const router3 = express.Router()
const router4 = express.Router()
const router5 = express.Router()
const {checkAuth, checkVerify} = require("../handlers/authVerify")
const users = require("../models/users");
const config = require("../config.json")
const logger = require("../handlers/logger")
const fs = require("fs")
const sanitize = require("sanitize-filename")
const osu = require("node-os-utils")
const ms = require("ms")
const rolesModel = require("../models/roles")

router.get("/", checkAuth, checkVerify, async function (req, res) {
    const request = require("request")
    const user = await users.findOne({ username: req.user.username})
    const allusers = await users.find()
    if (user.role == "admin") {
      const storagePlans = await storagePlansModel.find()
      const roles = await rolesModel.find()
      const cpu = osu.cpu
      cpu.usage().then((cpuUsage) => {
        request.get("https://version.daneeskripter.dev/daneecloud/version.txt", function (error, response, body) {
        res.render(__dirname + "/../views/admin.ejs", {users: allusers,  cloudname: config.cloudname, cpuUsage: cpuUsage, packages: require("../package.json"), stableVersion: body, ms: ms, plans: storagePlans, roles: roles})
        })
      })
    } else {
      res.render(__dirname + "/../views/message.ejs", { message: `<span class="material-icons">cloud_off</span>&nbsp;Error 401 - Unauthorized`,  cloudname: config.cloudname})
    }
  })

router2.get("/:account", checkAuth, checkVerify, async function (req, res) {
    const account = sanitize(req.params.account)
    const loggeduser = await users.findOne({username: req.user.username})
    if (loggeduser.isAdmin) {
      const findusertodelete = await users.findOne({username: account})
      if (!findusertodelete) {
        res.render(__dirname + "/../views/message.ejs", { message: `<span class="material-icons">cloud_off</span>&nbsp;Account not found`,  cloudname: config.cloudname})
      } else {
        const usertodelete = await users.findOneAndRemove({ username: account})
        fs.rmdirSync(__dirname + "/.." + config.uploadsfolder + `${account}/`)
        res.render(__dirname + "/../views/message.ejs", {message: `<span class="material-icons">cloud_done</span>&nbsp;Account ${account} has been deleted.`,  cloudname: config.cloudname})
      }
    } else {
      res.render(__dirname + "/../views/message.ejs", { message: `<span class="material-icons">cloud_off</span>&nbsp;Error 401 - Unauthorized`,  cloudname: config.cloudname})
      logger.logInfo(`${req.user.username} deleted account ${account}!`)
    }
  })


router3.get("/:account", checkAuth, checkVerify, function (req, res) {
    const account = req.params.account
    res.render(__dirname + "/../views/editaccount.ejs", { account: account,  cloudname: config.cloudname})
  })
  
router3.post("/:account", checkAuth, checkVerify, async function (req, res) {
    const account = sanitize(req.params.account)
    const newaccountname = sanitize(req.body.newname)
    const newaccountemail = sanitize(req.body.newemail)
    const loggeduser = await users.findOne({ username: req.user.username})
    if (loggeduser.isAdmin) {
      const findusertorename = await users.findOne({username: account})
      if (!findusertorename) {
        res.render(__dirname + "/../views/message.ejs", { message: `<span class="material-icons">cloud_off</span>&nbsp;Account not found`,  cloudname: config.cloudname})
      } else {
      const usertorename = await users.findOneAndUpdate({username: account}, {username: newaccountname, email: newaccountemail})
      fs.renameSync(__dirname + config.uploadsfolder + `${account}/`, __dirname + config.uploadsfolder + `${newaccountname}/`)
      res.render(__dirname + "/../views/message.ejs", { message: `<span class="material-icons">cloud_done</span>&nbsp;Account ${account} with ${findusertorename.email} email has been renamed to ${newaccountname} with ${newaccountemail} email`,  cloudname: config.cloudname})
      logger.logInfo(`${account} with ${findusertorename.email} email has been renamed to ${newaccountname} with ${newaccountemail} email by ${req.user.username}`)
    }
    } else {
      res.render(__dirname + "/../views/message.ejs", { message: `<span class="material-icons">cloud_off</span>&nbsp;Error 401 - Unauthorized`,  cloudname: config.cloudname})
    }
  })

router4.get("/:account", checkAuth, checkVerify, async function (req, res) {
    const account = req.params.account
    const loggeduser = await users.findOne({username: req.user.username})
    if (loggeduser.isAdmin) {
      const user = await users.findOneAndUpdate({ username: account}, {isAdmin: true})
      res.render(__dirname + "/../views/message.ejs", {message: `<span class="material-icons">cloud_done</span>&nbsp;Account ${account} is now admin.`,  cloudname: config.cloudname})
      logger.logInfo(`${req.user.username} set ${account} as admin!`)
    } else {
      res.render(__dirname + "/../views/message.ejs", { message: `<span class="material-icons">cloud_off</span>&nbsp;Error 401 - Unauthorized`,  cloudname: config.cloudname})
    }
  })

router5.get("/:account", checkAuth, checkVerify, async function (req, res) {
    const account = req.params.account
    const loggeduser = await users.findOne({username: req.user.username})
    if (loggeduser.isAdmin) {
      const user = await users.findOneAndUpdate({ username: account}, {isAdmin: false})
      res.render(__dirname + "/../views/message.ejs", {message: `<span class="material-icons">cloud_done</span>&nbsp;Account ${account} isn't admin now.`,  cloudname: config.cloudname})
      logger.logInfo(`${req.user.username} remove admin from ${account}`)
    } else {
      res.render(__dirname + "/../views/message.ejs", { message: `<span class="material-icons">cloud_off</span>&nbsp;Error 401 - Unauthorized`,  cloudname: config.cloudname})
    }
  })

module.exports.admin = router
module.exports.del = router2
module.exports.edit = router3
module.exports.addadmin = router4
module.exports.remadmin = router5