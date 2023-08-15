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
const lang = require("../lang/default.json")

router.post("/", checkAuth, checkVerify, checkAdmin, async function (req, res) {
    const role = sanitize(req.body.role)
    const maxStorage = sanitize(req.body.maxStorage)
    if (req.user.role == "admin") {
        const updateRole = await roles.findOneAndUpdate({name: role}, {maxStorage: parseInt(maxStorage), badge: req.body.badge})
        res.render(__dirname + "/../views/message.ejs", { message: lang["Role-Updated"].replace("${role}", role).replace("${maxStorage}", maxStorage),  cloudname: config.cloudname, lang: lang})
    } else {
    res.render(__dirname + "/../views/message.ejs", { message: `<i class="fa-solid fa-square-xmark"></i>&nbsp;${lang["Error401"]}`,  cloudname: config.cloudname, lang: lang})
    }
})

router2.get("/", checkAuth, checkVerify, checkAdmin, async function (req, res) {
    res.render(__dirname + "/../views/addrole.ejs", {cloudname: config.cloudname, csrfToken: req.csrfToken(), lang: lang})
})

router2.post("/", checkAuth, checkVerify, checkAdmin, async function (req, res) {
    const newRole = new roles({
        name: req.body.role,
        maxStorage: parseInt(req.body.storage),
        badge: req.body.badge
    })
    newRole.save()
    res.render(__dirname + "/../views/message.ejs", { message: `<i class="fa-solid fa-square-check"></i>&nbsp;${lang["Role-Added"].replace("${req.body.role}", req.body.role).replace("${req.body.storage}", req.body.storage)}`,  cloudname: config.cloudname, lang: lang})
})

router3.get("/", checkAuth, checkVerify, checkAdmin, async function (req, res) {
    const findRoles = await roles.find()
    res.render(__dirname + "/../views/delrole.ejs", { cloudname: config.cloudname, roles: findRoles, csrfToken: req.csrfToken(), lang: lang})
})

router3.post("/", checkAuth, checkVerify, checkAdmin, async function (req, res) {
    if (req.body.role == "admin") {
        res.render(__dirname + "/../views/message.ejs", { message: `<i class="fa-solid fa-square-xmark"></i>&nbsp;${lang["Del-Admin"]}`,  cloudname: config.cloudname, lang: lang})
    } else if (req.body.role == "user") {
        res.render(__dirname + "/../views/message.ejs", { message: `<i class="fa-solid fa-square-xmark"></i>&nbsp;${lang["Del-User"]}`,  cloudname: config.cloudname, lang: lang})
    } else {
        const deleteRole = await roles.findOneAndDelete({ name: req.body.role})
        res.render(__dirname + "/../views/message.ejs", { message: `<i class="fa-solid fa-square-check"></i>&nbsp;${lang["Role-Deleted"].replace("${req.body.role}", req.body.role)}`,  cloudname: config.cloudname, lang: lang})
    }
})

router4.get("/:username", checkAuth, checkVerify, checkAdmin, async function (req, res) {
    const findRoles = await roles.find()
    const user = req.params.username
    res.render(__dirname + "/../views/editrole.ejs", {cloudname: config.cloudname, roles: findRoles, user: user, csrfToken: req.csrfToken(), lang: lang})
})

router4.post("/:username", checkAuth, checkVerify, checkAdmin, async function (req, res) {
    const changeUserRole = await users.findOneAndUpdate({username: req.params.username}, {role: req.body.role})
    res.render(__dirname + "/../views/message.ejs", { message: `<i class="fa-solid fa-square-check"></i>&nbsp;${lang["Role-Changed"].replace("${req.params.username}", req.params.username).replace("${req.body.role}", req.body.role)}`,  cloudname: config.cloudname, lang: lang})
})
module.exports.updaterole = router
module.exports.addrole = router2
module.exports.delrole = router3
module.exports.editrole = router4