const express = require('express')
const router = express.Router()
const {checkAuth, checkVerify, checkNotAuth} = require("../handlers/authVerify")
const users = require("../models/users");
const roles = require("../models/roles")
const config = require("../config.json")
const sanitize = require("sanitize-filename")

router.get("/", checkAuth, checkVerify, async function (req, res) {
    const User = await users.findOne({username: req.user.username})
    const role = sanitize(req.query.role)
    const maxStorage = sanitize(req.query.maxStorage)
    if (User.role == "admin") {
        const updateRole = await roles.findOneAndUpdate({name: role}, {maxStorage: parseInt(maxStorage)})
        res.render(__dirname + "/../views/message.ejs", { message: `Role ${role} has been updated with maximum storage ${maxStorage} MB`,  cloudname: config.cloudname})
    } else {
    res.render(__dirname + "/../views/message.ejs", { message: `<span class="material-icons">cloud_off</span>&nbsp;Error 401 - Unauthorized`,  cloudname: config.cloudname})
    }
})

module.exports.updaterole = router