const express = require('express')
const router = express.Router()
const router2 = express.Router()
const {checkAuth, checkVerify, checkNotAuth} = require("../handlers/authVerify")
const config = require("../config.json")
const logger = require("../handlers/logger")
const fs = require("fs")
const sanitize = require("sanitize-filename")
const lang = require("../lang/default.json")

router.get("/", checkAuth, checkVerify, function (req, res) {
    const file = req.query.downloadfile
    res.redirect("/download/" + file)
  })


router2.get('/:downloadfile',  checkAuth, checkVerify, (req, res) => {
    const downloadfile = sanitize(req.params.downloadfile)
    fs.readFile( __dirname + "/.." + config.uploadsfolder + `${req.user.username}/` + downloadfile, (err, data) =>{
      if (err) {
        res.render(__dirname + "/../views/message.ejs", {message: `<span class="material-icons">cloud_off</span>&nbsp;File ${downloadfile} not found!`,  cloudname: config.cloudname, lang: lang})
      } else {
        res.contentType('application/octet-stream');
        res.send(data)
        logger.logInfo(`${req.user.username} downloaded ${downloadfile}!`)
      }
    })
  });

module.exports.dwnl = router
module.exports.download = router2