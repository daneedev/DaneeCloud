const express = require('express')
const router = express.Router()
const {checkAuth, checkVerify, checkNotAuth} = require("../handlers/authVerify")
const config = require("../config.json")
const sanitize = require("sanitize-filename")
const fs = require("fs")
const lang = require("../lang/default.json")

router.get("/:username/:file", checkAuth, checkVerify, function (req, res) {
    if (req.params.username == req.user.username) {
        const file = sanitize(req.params.file)
        if (fs.readdirSync(__dirname + "/.." + config.uploadsfolder + `${sanitize(req.params.username)}/`).includes(file)) {
          res.render(__dirname + "/../views/audio.ejs", {file: file, cloudname: config.cloudname, username: req.user.username, lang: lang})
        } else {
          res.render(__dirname + "/../views/message.ejs", {message: `<span class="material-icons">cloud_off</span>&nbsp;${lang["File-Not-Found"].replace("${file}", file)}`,  cloudname: config.cloudname, lang: lang})
        }
      } else {
        res.render(__dirname + "/../views/message.ejs", { message: `<span class="material-icons">cloud_off</span>&nbsp;${lang["Error401"]}`,  cloudname: config.cloudname, lang: lang})
      }
})

module.exports = router