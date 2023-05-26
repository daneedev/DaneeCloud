const express = require('express')
const router = express.Router()
const router2 = express.Router()
const router3 = express.Router()
const {checkAuth, checkVerify, checkNotAuth} = require("../handlers/authVerify")
const config = require("../config.json")
const sanitize = require("sanitize-filename")
const fs = require("fs")
const vidSubtitle = require("../models/vidsubtitles")
const lang = require("../lang/default.json")

router.get("/:username/:file", checkAuth, checkVerify, async function (req, res) {
    if (req.params.username == req.user.username) {
        const file = sanitize(req.params.file)
        if (fs.readdirSync(__dirname + "/.." + config.uploadsfolder + `${sanitize(req.params.username)}/`).includes(file)) {
          const vidtag = file.split(".").pop()
          const subtitles = await vidSubtitle.findOne({ filename: file}) || "None"
          res.render(__dirname + "/../views/video.ejs", {file: file, vidtag: vidtag, cloudname: config.cloudname, username: req.user.username, subtitles: subtitles, lang: lang})
        } else {
          res.render(__dirname + "/../views/message.ejs", {message: `<span class="material-icons">cloud_off</span>&nbsp;File ${file} not found!`,  cloudname: config.cloudname, lang: lang})
        }
      } else {
        res.render(__dirname + "/../views/message.ejs", { message: `<span class="material-icons">cloud_off</span>&nbsp;Error 401 - Unauthorized`,  cloudname: config.cloudname, lang: lang})
      }
})

router2.get("/:username/:file", checkAuth, checkVerify, async function (req, res) {
  if (req.params.username == req.user.username) {
    if (fs.readdirSync(__dirname + "/.." + config.uploadsfolder + `${sanitize(req.params.username)}/`).includes(req.params.file)) {
      if (await vidSubtitle.findOne({ filename: req.params.file })) {
        res.render(__dirname + "/../views/message.ejs", { message: `<span class="material-icons">cloud_off</span>&nbsp;This file already have subtitles`,  cloudname: config.cloudname})
      } else {
      res.render(__dirname + "/../views/addsubtitles.ejs", {cloudname: config.cloudname, req: req, csrfToken: req.csrfToken()})
      }
    } else {
      res.render(__dirname + "/../views/message.ejs", { message: `<span class="material-icons">cloud_off</span>&nbsp;File not found`,  cloudname: config.cloudname})
    }
    } else {
    res.render(__dirname + "/../views/message.ejs", { message: `<span class="material-icons">cloud_off</span>&nbsp;Error 401 - Unauthorized`,  cloudname: config.cloudname})
  }
})

router2.post("/:username/:file", checkAuth, checkVerify, async function (req, res) {
  if (req.params.username == req.user.username) {
    const file = sanitize(req.params.file)
    const Subtitles = new vidSubtitle({
      filename: file,
      subtitleurl: req.body.url,
      subtitlename: req.body.name
    })
    Subtitles.save()
    res.render(__dirname + "/../views/message.ejs", { message: `<span class="material-icons">cloud_done</span>&nbsp;Subtitles ${req.body.name} successfully added to ${file}`,  cloudname: config.cloudname})
  } else {
    res.render(__dirname + "/../views/message.ejs", { message: `<span class="material-icons">cloud_off</span>&nbsp;Error 401 - Unauthorized`,  cloudname: config.cloudname})
  }
})

router3.get("/:username/:file", checkAuth, checkVerify, async function (req, res) {
  if (req.params.username == req.user.username) {
    const file = req.params.file
    if (fs.readdirSync(__dirname + "/.." + config.uploadsfolder + `${sanitize(req.params.username)}/`).includes(file) && await vidSubtitle.findOne({ filename: file})) {
      const removeSubtitles = await vidSubtitle.findOneAndRemove({ filename: file})
      res.render(__dirname + "/../views/message.ejs", { message: `<span class="material-icons">cloud_done</span>&nbsp;Subtitles successfully removed from ${file}`,  cloudname: config.cloudname})
    } else {
      res.render(__dirname + "/../views/message.ejs", { message: `<span class="material-icons">cloud_off</span>&nbsp;This file has no subtitles`,  cloudname: config.cloudname})
    }
  } else {
    res.render(__dirname + "/../views/message.ejs", { message: `<span class="material-icons">cloud_off</span>&nbsp;Error 401 - Unauthorized`,  cloudname: config.cloudname})
  }
})

module.exports.player = router
module.exports.subtitles = router2
module.exports.rmsubtitles = router3