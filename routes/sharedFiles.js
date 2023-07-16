const express = require('express')
const router = express.Router()
const router2 = express.Router()
const router3 = express.Router()
const {checkAuth, checkVerify, checkNotAuth, checkNotVerify} = require("../handlers/authVerify")
const users = require("../models/users");
const config = require("../config.json")
const logger = require("../handlers/logger")
const fs = require("fs")
const sanitize = require("sanitize-filename")
const isimg = require("is-image")
const isvid = require("is-video")
const lang = require("../lang/default.json")

router.get("/:username/:file", async function (req, res) {
    const user = await users.findOne({username: req.params.username})
    if (!user) {
      res.render(__dirname + "/../views/message.ejs", { cloudname: config.cloudname, message: `<i class="fa-solid fa-square-xmark"></i>&nbsp;${lang["Username-Not-Exist"]}`, lang: lang})
    } else if (!user.sharedFiles.includes(req.params.file)) {
      res.render(__dirname + "/../views/message.ejs", { cloudname: config.cloudname, message: `<i class="fa-solid fa-square-xmark"></i>&nbsp;${lang["No-Shared-File"]}`, lang: lang})
    } else {
      fs.readFile( __dirname + "/.." + config.uploadsfolder + `${sanitize(req.params.username)}/` + sanitize(req.params.file), (err, data) => {
        if (err) {
          logger.logError(err)
        } else {
          if (isimg(__dirname + "/.." +config.uploadsfolder + `${sanitize(req.params.username)}/` + sanitize(req.params.file))) {
            res.setHeader("Content-Type", "image/png");
            res.send(data)
          } else if (isvid(__dirname + "/.." + config.uploadsfolder + `${sanitize(req.params.username)}/` + sanitize(req.params.file))) {
            const vidtag = req.params.file.split(".").pop()
            res.render(__dirname + "/../views/video.ejs", {file: req.params.file, vidtag: vidtag, cloudname: config.cloudname, username: req.params.username, lang: lang})
          } else {
            res.contentType('application/octet-stream');
            res.send(data)
          }
          logger.logInfo(`Someone downloaded ${req.params.file} from ${req.params.username}`)
        }
      })
    }
})

router2.get("/:file", checkAuth, checkVerify, async function (req, res) {
    const file = req.params.file
    const user = await users.findOne({username: req.user.username})
    if (user.sharedFiles.includes(file)) {
      res.render(__dirname + "/../views/message.ejs", { cloudname: config.cloudname, message: `<i class="fa-solid fa-square-xmark"></i>&nbsp;${lang["File-Already-Shared"]}`, lang: lang})
    } else {
      user.sharedFiles.push(file)
      user.save()
      res.render(__dirname + "/../views/message.ejs", { cloudname: config.cloudname, message: `<i class="fa-solid fa-square-check"></i>&nbsp;${lang["File-Shared"].replace("${file}", file)} <a href=${config.cloudurl}/sf/${req.user.username}/${file}>Link</a>`, lang: lang})
      logger.logInfo(`${req.user.username} shared ${file}!`)
    }
})

router3.get("/:file", checkAuth, checkVerify, async function (req, res) {
    const file = req.params.file
    const user = await users.findOne({username: req.user.username})
    if (!user.sharedFiles.includes(file)) {
      res.render(__dirname + "/../views/message.ejs", { cloudname: config.cloudname, message: `<i class="fa-solid fa-square-xmark"></i>&nbsp;${lang["File-Not-Shared"].replace("${file}", file)}`, lang: lang})
    } else {
      user.sharedFiles.pull(file)
      user.save()
      res.render(__dirname + "/../views/message.ejs", { cloudname: config.cloudname, message: `<i class="fa-solid fa-square-check"></i>&nbsp;${lang["Disabled-Shared"].replace("${file}", file)}`, lang: lang})
      logger.logInfo(`${req.user.username} set ${file} as not shared!`)
    } 
})

module.exports.sf = router
module.exports.addsf = router2
module.exports.rmsf = router3