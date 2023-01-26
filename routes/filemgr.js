const express = require('express')
const router = express.Router()
const router2 = express.Router()
const router3 = express.Router()
const {checkAuth, checkVerify} = require("../handlers/authVerify")
const users = require("../models/users");
const config = require("../config.json")
const logger = require("../handlers/logger")
const fs = require("fs")
const sanitize = require("sanitize-filename")
const isimg = require("is-image")
const isvid = require("is-video")

router.get("/", checkAuth, checkVerify, async function (req, res) {
    const user = await users.findOne({username: req.user.username})
    const files = user.files
    const sharedFiles = user.sharedFiles
    res.render(__dirname + "/../views/myfiles.ejs", {files: files,  cloudname: config.cloudname, fs: fs, config: config, req: req, __dirname: __dirname, isImg: isimg, Buffer: Buffer, sharedFiles: sharedFiles, isVid: isvid})
  })



router2.get("/:file", checkAuth, checkVerify, function (req, res) {
    const file = sanitize(req.params.file)
    fs.readFile( __dirname + "/.." + config.uploadsfolder + `${req.user.username}/` + file, async (err, data) =>{
      if (err) {
        res.render(__dirname + "/../views/message.ejs", {message: `<span class="material-icons">cloud_off</span>&nbsp;File ${file} not found!`,  cloudname: config.cloudname})
      } else {
        fs.unlinkSync(__dirname + "/.." + config.uploadsfolder + `${req.user.username}/` + file)
        const user = await users.findOne({ username: req.user.username})
        user.files.pull(file)
        if (user.sharedFiles.includes(file)) {
          user.sharedFiles.pull(file)
        }
        user.save()
        res.redirect("/myfiles")
        logger.logInfo(`${req.user.username} deleted ${file}!`)
      }
    })
  })

router3.get("/:file", checkAuth, checkVerify, function (req, res) {
  const file = req.params.file
  if (fs.readdirSync(__dirname + "/.." + config.uploadsfolder + `${req.user.username}/`).includes(file)) {
    res.render(__dirname + "/../views/rename.ejs", { file: file,  cloudname: config.cloudname})
  } else {
    res.render(__dirname + "/../views/message.ejs", {message: `<span class="material-icons">cloud_off</span>&nbsp;File ${file} not found!`,  cloudname: config.cloudname})
  }
})

router3.post("/:file", checkAuth, checkVerify, async function (req, res) {
  const oldname = sanitize(req.params.file)
  const newname = sanitize(req.body.newname.replace(/ /g, "_")) + "." + oldname.split(".").pop()
  fs.renameSync(__dirname + "/.." + config.uploadsfolder + `${req.user.username}/` + oldname, __dirname + "/.."  + config.uploadsfolder + `${req.user.username}/` + newname)
  const user = await users.findOne({ username: req.user.username})
  user.files.pull(oldname)
  user.files.push(newname)
  if (user.sharedFiles.includes(oldname)) {
    user.sharedFiles.pull(oldname)
    user.sharedFiles.push(newname)
  }
  user.save()
  res.render(__dirname + "/../views/message.ejs", {message: `<span class="material-icons">cloud_done</span>&nbsp;File ${oldname} has been renamed to ${newname}`,  cloudname: config.cloudname})
  logger.logInfo(`${req.user.username} renamed ${oldname} to ${newname}!`)
})

module.exports.myfiles = router
module.exports.del = router2
module.exports.ren = router3