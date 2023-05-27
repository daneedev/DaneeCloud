const express = require('express')
const router = express.Router()
const {checkAuth, checkVerify, checkNotAuth, checkNotVerify} = require("../handlers/authVerify")
const config = require("../config.json")
const passport = require("passport")
const lang = require("../lang/default.json")

router.get("/", checkNotAuth, function (req, res) {
    res.render(__dirname + "/../views/login.ejs", { cloudname: config.cloudname, csrfToken: req.csrfToken(), lang: lang})
})

router.post("/", checkNotAuth, passport.authenticate("local", {
    successRedirect: "/",
    failureRedirect: "/login",
    failureFlash: true
  }))

module.exports = router