const express = require('express')
const router = express.Router()
const {checkAuth, checkVerify, checkNotAuth} = require("../handlers/authVerify")
const users = require("../models/users");
const roles = require("../models/roles")
const router2 = express.Router()
const config = require("../config.json")
const sanitize = require("sanitize-filename")
const {checkAdmin} = require("../handlers/checkAdmin")
const router3 = express.Router()
const router4 = express.Router()

router.post("/", checkAuth, checkVerify, checkAdmin, async function (req, res) {
    const role = sanitize(req.body.role)
    const maxStorage = sanitize(req.body.maxStorage)
    const updateRole = await roles.findOneAndUpdate({name: role}, {maxStorage: parseInt(maxStorage), badge: req.body.badge})
    res.render(__dirname + "/../views/message.ejs", { message: `Role ${role} has been updated with maximum storage ${maxStorage} MB`,  cloudname: config.cloudname})
    res.render(__dirname + "/../views/message.ejs", { message: `<span class="material-icons">cloud_off</span>&nbsp;Error 401 - Unauthorized`,  cloudname: config.cloudname})
})

router2.get("/", checkAuth, checkVerify, checkAdmin, async function (req, res) {
    res.render(__dirname + "/../views/addrole.ejs", {cloudname: config.cloudname, csrfToken: req.csrfToken()})
    const client = require("../index").presence
    client.updatePresence({
        state: `Creating new role`,
        startTimestamp: Date.now(),
        largeImageKey: config.richpresencelogo,
        instance: true,
      });
})

router2.post("/", checkAuth, checkVerify, checkAdmin, async function (req, res) {
    const newRole = new roles({
        name: req.body.role,
        maxStorage: parseInt(req.body.storage),
        badge: req.body.badge
    })
    newRole.save()
    res.render(__dirname + "/../views/message.ejs", { message: `<span class="material-icons">cloud_done</span>&nbsp;Role ${req.body.role} (${req.body.storage} MB) added!`,  cloudname: config.cloudname})
})

router3.get("/", checkAuth, checkVerify, checkAdmin, async function (req, res) {
    const findRoles = await roles.find()
    res.render(__dirname + "/../views/delrole.ejs", { cloudname: config.cloudname, roles: findRoles, csrfToken: req.csrfToken()})
})

router3.post("/", checkAuth, checkVerify, checkAdmin, async function (req, res) {
    if (req.body.role == "admin") {
        res.render(__dirname + "/../views/message.ejs", { message: `<span class="material-icons">cloud_off</span>&nbsp;You can't delete admin role!`,  cloudname: config.cloudname})
    } else if (req.body.role == "user") {
        res.render(__dirname + "/../views/message.ejs", { message: `<span class="material-icons">cloud_off</span>&nbsp;You can't delete user role!`,  cloudname: config.cloudname})
    } else {
        const deleteRole = await roles.findOneAndDelete({ name: req.body.role})
        res.render(__dirname + "/../views/message.ejs", { message: `<span class="material-icons">cloud_done</span>&nbsp;Role ${req.body.role} has been deleted!`,  cloudname: config.cloudname})
    }
})

router4.get("/:username", checkAuth, checkVerify, checkAdmin, async function (req, res) {
    const findRoles = await roles.find()
    const user = req.params.username
    res.render(__dirname + "/../views/editrole.ejs", {cloudname: config.cloudname, roles: findRoles, user: user, csrfToken: req.csrfToken()})
})

router4.post("/:username", checkAuth, checkVerify, checkAdmin, async function (req, res) {
    const changeUserRole = await users.findOneAndUpdate({username: req.params.username}, {role: req.body.role})
    res.render(__dirname + "/../views/message.ejs", { message: `<span class="material-icons">cloud_done</span>&nbsp;${req.params.username}'s role has been changed to ${req.body.role}!`,  cloudname: config.cloudname})
})
module.exports.updaterole = router
module.exports.addrole = router2
module.exports.delrole = router3
module.exports.editrole = router4