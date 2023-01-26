const express = require('express')
const router = express.Router()
const {checkAuth, checkVerify, checkNotAuth} = require("../handlers/authVerify")
const users = require("../models/users");
const config = require("../config.json")
const logger = require("../handlers/logger")
const fs = require("fs")
const sanitize = require("sanitize-filename")
const upload = multer()


router.post("/", upload.single('file'), checkAuth, checkVerify, function (req, res) {
    const name = sanitize(req.file.originalname.replace(/ /g, "_"))
    if (removeaccents.has(name)) {
      res.send("Please upload files without accents.")
    } else {
      if (fs.readdirSync(__dirname + "/.." + config.uploadsfolder + `${req.user.username}/`).includes(name)) {
        res.render(__dirname + "/../views/message2.ejs", {message: `<span class="material-icons">file_copy</span>&nbsp;File ${name} already exist!`,  cloudname: config.cloudname})
      } else {
        fs.writeFile(__dirname + "/.." + config.uploadsfolder + `${req.user.username}/` +  name, req.file.buffer, async  err => {
          if (err) {
            res.send(err);
          } else {
            res.render(__dirname + "/../views/message2.ejs", {message: `<span class="material-icons">cloud_done</span>&nbsp;File ${name} uploaded succesfully!`,  cloudname: config.cloudname})
            const user = await users.findOne({username: req.user.username})
            user.files.push(name)
            user.save()
            logger.logInfo(`${req.user.username} uploaded ${name}!`)
          }
        });
      }
    }
  });

module.exports = router