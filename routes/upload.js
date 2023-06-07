const express = require('express')
const router = express.Router()
const {checkAuth, checkVerify, checkNotAuth} = require("../handlers/authVerify")
const users = require("../models/users");
const config = require("../config.json")
const logger = require("../handlers/logger")
const fs = require("fs")
const sanitize = require("sanitize-filename")
const multer = require("multer")
const upload = multer()
const removeaccents = require("remove-accents")
const roles = require("../models/roles")
const lang = require("../lang/default.json")

router.post("/", upload.single('file'), checkAuth, checkVerify, async function (req, res) {
    const name = sanitize(req.file.originalname.replace(/ /g, "_"))
    if (removeaccents.has(name)) {
      res.send("Please upload files without accents.")
    } else {
      let dir;
      if (req.body.dest == "/") {
        dir = __dirname + "/.." + config.uploadsfolder + `${req.user.username}/`
      } else {
        dir = __dirname + "/.." + config.uploadsfolder + `${req.user.username}/${sanitize(req.body.dest)}/`
      }
      if (fs.readdirSync(dir).includes(name)) {
        res.render(__dirname + "/../views/message2.ejs", {message: `<span class="material-icons">file_copy</span>&nbsp;${lang["File-Already-Exist"].replace("${name}", name)}`,  cloudname: config.cloudname, lang: lang})
      } else {
        const user = await users.findOne({username: req.user.username})
        const role = await roles.findOne({name: user.role})
        if (req.file.size / (1024 * 1024).toFixed(2) + user.usedStorage > role.maxStorage) {
          res.render(__dirname + "/../views/message2.ejs", {message: `<span class="material-icons">storage</span>&nbsp;${lang["Limit-Reached"]}`,  cloudname: config.cloudname, lang: lang})
        } else {
        fs.writeFile(dir +  name, req.file.buffer, async  err => {
          if (err) {
            res.send(err);
          } else {
            res.render(__dirname + "/../views/message2.ejs", {message: `<span class="material-icons">cloud_done</span>&nbsp;${lang["File-Uploaded"].replace("${name}", name)}`,  cloudname: config.cloudname, lang: lang})
            const filesize = req.file.size / (1024 * 1024) + user.usedStorage
            if (req.body.dest == "/") {
            user.files.push(name)
            }
            const updatestorage = await users.findOneAndUpdate({username: req.user.username}, {usedStorage: parseInt(filesize.toFixed(2))})
            user.save()
            logger.logInfo(`${req.user.username} uploaded ${name}!`)
          }
        });
      }
    }
    }
  });

module.exports = router