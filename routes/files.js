const express = require('express')
const router = express.Router()
const {checkAuth, checkVerify} = require("../handlers/authVerify")
const config = require("../config.json")
const fs = require("fs")
const isimg = require("is-image")
const sanitize = require("sanitize-filename")
const lang = require("../lang/default.json")

router.get("/:username/:file", checkAuth, checkVerify, function (req, res) {
    if (req.params.username == req.user.username) {
        const file = sanitize(req.params.file)
        if (fs.readdirSync(__dirname + "/.."  + config.uploadsfolder + `${sanitize(req.params.username)}/`).includes(file)) {
          const requestedfile = fs.readFileSync(__dirname + "/.." + config.uploadsfolder + `${sanitize(req.params.username)}/` + file)
          if (isimg(__dirname + "/.." + config.uploadsfolder + `${sanitize(req.params.username)}/` + file)) {
            res.setHeader("Content-Type", "image/png");
          }
          res.send(requestedfile)
        } else {
          res.render(__dirname + "/../views/message.ejs", {message: `<span class="material-icons">cloud_off</span>&nbsp;File ${file} not found!`,  cloudname: config.cloudname, lang: lang})
        }
      } else {
        res.render(__dirname + "/../views/message.ejs", { message: `<span class="material-icons">cloud_off</span>&nbsp;Error 401 - Unauthorized`,  cloudname: config.cloudname, lang: lang})
      }
})

module.exports = router