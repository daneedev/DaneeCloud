const express = require('express')
const router = express.Router()
const {checkAuth, checkVerify, checkNotAuth, checkNotVerify} = require("../handlers/authVerify")
const config = require("../config.json")
const passport = require("passport")

router.get("/", checkNotAuth, function (req, res) {
    res.render(__dirname + "/../views/login.ejs", { cloudname: config.cloudname, csrfToken: req.csrfToken()})
    const client = require("../index").presence
    client.updatePresence({
      state: 'Browsing login page',
      startTimestamp: Date.now(),
      largeImageKey: config.richpresencelogo,
      instance: true,
    });
})

router.post("/", checkNotAuth, passport.authenticate("local", {
    successRedirect: "/",
    failureRedirect: "/login",
    failureFlash: true
  }))

module.exports = router