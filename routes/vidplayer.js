const express = require('express')
const router = express.Router()
const {checkAuth, checkVerify, checkNotAuth} = require("../handlers/authVerify")
const users = require("../models/users");
const config = require("../config.json")

router.get("/:username/:file", checkAuth, checkVerify, function (req, res) {
    if (req.params.username == req.user.username) {
        const file = sanitize(req.params.file)
        if (fs.readdirSync(__dirname + "/.." + config.uploadsfolder + `${sanitize(req.params.username)}/`).includes(file)) {
          const vidtag = file.split(".").pop()
          res.render(__dirname + "/../views/video.ejs", {file: file, vidtag: vidtag, cloudname: config.cloudname, username: req.user.username})
        } else {
          res.render(__dirname + "/../views/message.ejs", {message: `<span class="material-icons">cloud_off</span>&nbsp;File ${file} not found!`,  cloudname: config.cloudname})
        }
      } else {
        res.render(__dirname + "/../views/message.ejs", { message: `<span class="material-icons">cloud_off</span>&nbsp;Error 401 - Unauthorized`,  cloudname: config.cloudname})
      }
})

module.exports = router