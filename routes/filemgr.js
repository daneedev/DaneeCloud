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

router.get("/", checkAuth, checkVerify, async function (req, res) {
    const user = await users.findOne({username: req.user.username})
    const files = user.files
    const sharedFiles = user.sharedFiles
    res.render(__dirname + "/../views/myfiles.ejs", {files: files,  cloudname: config.cloudname, fs: fs, config: config, req: req, __dirname: __dirname, isImg: isimg, Buffer: Buffer, sharedFiles: sharedFiles})
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


module.exports.myfiles = router
module.exports.del = router2