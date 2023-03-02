const express = require('express')
const router = express.Router()
const {checkAuth, checkVerify} = require("../handlers/authVerify")
const users = require("../models/users");
const config = require("../config.json")
const roles = require("../models/roles")

router.get("/", checkAuth , checkVerify, async function (req, res) {
    const user = await users.findOne({username: req.user.username})
    const role = await roles.findOne({name: user.role})
    if (!user.ip && config.registerip) {
      const ip = req.headers['x-forwarded-for'] || req.connection.remoteAddress;
      await user.updateOne({ip: ip})
    }
    let isAdmin;
    if (user.role == "admin") {
      isAdmin = true
    } else {
      isAdmin = false
    }
    res.render(__dirname + "/../views/index.ejs", {isAdmin: isAdmin, username: req.user.username, cloudname: config.cloudname, usedStorage: user.usedStorage, maxStorage: role.maxStorage} )
  })

module.exports = router