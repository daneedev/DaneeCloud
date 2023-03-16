const express = require("express") 
const router = express.Router()
const router2 = express.Router()
const {checkAuth, checkVerify} = require("../handlers/authVerify")
const users = require("../models/users");
const config = require("../config.json")
const logger = require("../handlers/logger")
const fs = require("fs")
const sanitize = require("sanitize-filename")

router.get("/", checkAuth, checkVerify, function (req, res) {
    const user = req.user
    res.render(__dirname + "/../views/editaccount.ejs", { account: user.username,  cloudname: config.cloudname, editaccurl: "/editmyaccount/", csrfToken: req.csrfToken()})
})

router.post("/:username", checkAuth, checkVerify, async function (req, res) {
    const user = req.user
    const newaccountname = sanitize(req.body.newname)
    const newaccountemail = sanitize(req.body.newemail)
    const updateuser = await users.findOneAndUpdate({username: user.username}, {username: newaccountname, email: newaccountemail})
    logger.logInfo(`User ${user.username} updated his account`)
    res.render(__dirname + "/../views/message.ejs", { message: `<span class="material-icons">cloud_done</span>&nbsp;Your account has been updated!`,  cloudname: config.cloudname})
})

router2.get("/", checkAuth, checkVerify, function (req, res) {
    res.render(__dirname + "/../views/delacc.ejs", { cloudname: config.cloudname })
})

router2.post("/", checkAuth, checkVerify, async function (req, res) {
    const user = req.user
    const delaccount = await users.findOneAndRemove({ username: user.username})
    fs.rmdirSync(__dirname + "/.." + config.uploadsfolder + `${user.username}/`)
    logger.logInfo(`User ${user.username} has been deleted!`)
    res.render(__dirname + "/../views/message.ejs", { message: `<span class="material-icons">cloud_done</span>&nbsp;Your account has been deleted!`,  cloudname: config.cloudname})
})

module.exports.edit = router
module.exports.delete = router2