const express = require('express')
const router = express.Router()
const {checkAuth, checkVerify, checkNotAuth, checkNotVerify} = require("../handlers/authVerify")
const users = require("../models/users");
const config = require("../config.json")
const passport = require("passport")

router.get("/", checkNotAuth, function (req, res) {
    res.render(__dirname + "/../views/login.ejs", { cloudname: config.cloudname })
})

router.post("/", checkNotAuth, passport.authenticate("local", {
    successRedirect: "/",
    failureRedirect: "/login",
    failureFlash: true
  }))

module.exports = router