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
          res.render(__dirname + "/../views/message.ejs", {message: `<i class="fa-solid fa-square-xmark"></i>&nbsp;${lang["File-Not-Found"].replace("${file}", file)}`,  cloudname: config.cloudname, lang: lang})
        }
      } else {
        res.render(__dirname + "/../views/message.ejs", { message: `<i class="fa-solid fa-square-xmark"></i>&nbsp;${lang["Error401"]}`,  cloudname: config.cloudname, lang: lang})
      }
})

router2.get("/:username/:file", checkAuth, checkVerify, async function (req, res) {
  if (req.params.username == req.user.username) {
    if (fs.readdirSync(__dirname + "/.." + config.uploadsfolder + `${sanitize(req.params.username)}/`).includes(req.params.file)) {
      if (await vidSubtitle.findOne({ filename: req.params.file })) {
        res.render(__dirname + "/../views/message.ejs", { message: `<i class="fa-solid fa-square-xmark"></i>&nbsp;${lang["Have-Subtitles"]}`,  cloudname: config.cloudname, lang: lang})
      } else {
      res.render(__dirname + "/../views/addsubtitles.ejs", {cloudname: config.cloudname, req: req, csrfToken: req.csrfToken(), lang: lang})
      }
    } else {
      res.render(__dirname + "/../views/message.ejs", { message: `<i class="fa-solid fa-square-xmark"></i>&nbsp;${lang["File-Not-Found2"]}`,  cloudname: config.cloudname, lang: lang})
    }
    } else {
    res.render(__dirname + "/../views/message.ejs", { message: `<i class="fa-solid fa-square-xmark"></i>&nbsp;${lang["Error401"]}`,  cloudname: config.cloudname, lang: lang})
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
    res.render(__dirname + "/../views/message.ejs", { message: `<i class="fa-solid fa-square-check"></i>&nbsp;${lang["Subtitles-Added"].replace("${req.body.name}", req.body.name).replace("${file}", file)}`,  cloudname: config.cloudname, lang: lang})
  } else {
    res.render(__dirname + "/../views/message.ejs", { message: `<i class="fa-solid fa-square-xmark"></i>&nbsp;${lang["Error401"]}`,  cloudname: config.cloudname, lang: lang})
  }
})

router3.get("/:username/:file", checkAuth, checkVerify, async function (req, res) {
  if (req.params.username == req.user.username) {
    const file = req.params.file
    if (fs.readdirSync(__dirname + "/.." + config.uploadsfolder + `${sanitize(req.params.username)}/`).includes(file) && await vidSubtitle.findOne({ filename: file})) {
      const removeSubtitles = await vidSubtitle.findOneAndRemove({ filename: file})
      res.render(__dirname + "/../views/message.ejs", { message: `<i class="fa-solid fa-square-check"></i>&nbsp;${lang["Subtitles-Removed"].replace("${file}", file)}`,  cloudname: config.cloudname, lang: lang})
    } else {
      res.render(__dirname + "/../views/message.ejs", { message: `<i class="fa-solid fa-square-xmark"></i>&nbsp;${lang["No-Subtitles"]}`,  cloudname: config.cloudname, lang: lang})
    }
  } else {
    res.render(__dirname + "/../views/message.ejs", { message: `<i class="fa-solid fa-square-xmark"></i>&nbsp;${lang["Error401"]}`,  cloudname: config.cloudname, lang: lang})
  }
})

module.exports.player = router
module.exports.subtitles = router2
module.exports.rmsubtitles = router3