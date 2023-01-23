const express = require('express');
const multer = require('multer');
const fs = require('fs');
const removeaccents = require("remove-accents")
const app = express();
const upload = multer()
var RateLimit = require('express-rate-limit');
var sanitize = require("sanitize-filename");
const config = require("./config.json")
const mongoose = require("mongoose")
const bcrypt = require("bcrypt")
const passport = require("passport")
const flash = require("express-flash")
const session = require("express-session")
const methodOverride = require("method-override")
const isimg = require("is-image")
const logger = require("./handlers/logger")
const updater = require("./handlers/updater")
const osu = require("node-os-utils")
const ms = require("ms")
const isvid = require("is-video")
app.use(methodOverride("_method"))
const {checkAuth, checkNotAuth, checkVerify, checkNotVerify} = require("./handlers/authVerify")

if (process.env.NODE_ENV !== "production") {
  require("dotenv").config()
}

// PASSPORT & SESSION
const initializePassport = require("./handlers/passportconfig")
initializePassport(passport)
app.use(flash())
app.use(session({
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
}))

app.use(passport.initialize())
app.use(passport.session())

// DATABASE

const users = require("./models/users");
mongoose.connect(process.env.mongo_srv, {
}).then(() =>[
  logger.logSuccess("Connected to the database!")
]).catch((err) =>{
  logger.logError('Failed connect to the database!')
})

// RATE LIMITING
const limiter = RateLimit({
  windowMs: 15*60*1000, // 15 minute
  max: 500
});
app.use(limiter);

// AUTH LIMITING
const AuthLimiter = RateLimit({
  windowsMs: 15*60*1000, // 15 minutes
  message: 'Too many authantifications, please try again after an 15 minutes',
  max: 300
})

app.use("/files/", require("./routes/files"))


app.use("/files/", AuthLimiter, checkAuth, checkVerify, express.static(__dirname + "/uploads/"))
app.set("view-engine", "ejs")
app.use(express.urlencoded({ extended: false}))

app.use("/", require("./routes/home"))

// REGISTER
app.use("/register", require("./routes/register"))

// LOGIN

app.use("/login", require("./routes/login"))

// SHARED FILES

app.use("/sf/", require("./routes/sharedFiles").sf)

app.use("/addsf/", require("./routes/sharedFiles").addsf)

app.use("/rmsf/", require("./routes/sharedFiles").rmsf)

// PLAY VIDEO

app.use("/playvideo/", require("./routes/vidplayer"))

// EMAIL VERIFY

app.use("/verify", require("./routes/emailVerify").ver)

app.use("/verifycode", require("./routes/emailVerify").verCode)

// LOG OUT

app.delete("/logout", (req, res) => {
  req.logOut( (err) => {
    if (err) return logger.logError(err)
  })
  res.redirect("/login")
})

// MY FILES

app.get("/myfiles", checkAuth, checkVerify, async function (req, res) {
  const user = await users.findOne({username: req.user.username})
  const files = user.files
  const sharedFiles = user.sharedFiles
  res.render(__dirname + "/views/myfiles.ejs", {files: files,  cloudname: config.cloudname, fs: fs, config: config, req: req, __dirname: __dirname, isImg: isimg, Buffer: Buffer, sharedFiles: sharedFiles})
})

// DELETE FILE

app.get("/delete/:file", checkAuth, checkVerify, function (req, res) {
  const file = sanitize(req.params.file)
  fs.readFile( __dirname + config.uploadsfolder + `${req.user.username}/` + file, async (err, data) =>{
    if (err) {
      res.render(__dirname + "/views/message.ejs", {message: `<span class="material-icons">cloud_off</span>&nbsp;File ${file} not found!`,  cloudname: config.cloudname})
    } else {
      fs.unlinkSync(__dirname + config.uploadsfolder + `${req.user.username}/` + file)
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

// RENAME FILE

app.get("/rename/:file", checkAuth, checkVerify, function (req, res) {
  const file = req.params.file
  if (fs.readdirSync(__dirname + config.uploadsfolder + `${req.user.username}/`).includes(file)) {
    res.render(__dirname + "/views/rename.ejs", { file: file,  cloudname: config.cloudname})
  } else {
    res.render(__dirname + "/views/message.ejs", {message: `<span class="material-icons">cloud_off</span>&nbsp;File ${file} not found!`,  cloudname: config.cloudname})
  }
})

app.post("/rename/:file", checkAuth, checkVerify, async function (req, res) {
  const oldname = sanitize(req.params.file)
  const newname = sanitize(req.body.newname.replace(/ /g, "_")) + "." + oldname.split(".").pop()
  fs.renameSync(__dirname + config.uploadsfolder + `${req.user.username}/` + oldname, __dirname + config.uploadsfolder + `${req.user.username}/` + newname)
  const user = await users.findOne({ username: req.user.username})
  user.files.pull(oldname)
  user.files.push(newname)
  if (user.sharedFiles.includes(oldname)) {
    user.sharedFiles.pull(oldname)
    user.sharedFiles.push(newname)
  }
  user.save()
  res.render(__dirname + "/views/message.ejs", {message: `<span class="material-icons">cloud_done</span>&nbsp;File ${oldname} has been renamed to ${newname}`,  cloudname: config.cloudname})
  logger.logInfo(`${req.user.username} renamed ${oldname} to ${newname}!`)
})

// ADMIN PANEL

app.get("/admin/", checkAuth, checkVerify, async function (req, res) {
  const request = require("request")
  const user = await users.findOne({ username: req.user.username})
  const allusers = await users.find()
  if (user.isAdmin) {
    const cpu = osu.cpu
    cpu.usage().then((cpuUsage) => {
      request.get("https://version.daneeskripter.tk/daneecloud/version.txt", function (error, response, body) {
      res.render(__dirname + "/views/admin.ejs", {users: allusers,  cloudname: config.cloudname, cpuUsage: cpuUsage, packages: require("./package.json"), stableVersion: body, ms: ms})
      })
    })
  } else {
    res.render(__dirname + "/views/message.ejs", { message: `<span class="material-icons">cloud_off</span>&nbsp;Error 401 - Unauthorized`,  cloudname: config.cloudname})
  }
})

// DELETE ACCOUNT

app.get("/deleteaccount/:account", checkAuth, checkVerify, async function (req, res) {
  const account = sanitize(req.params.account)
  const loggeduser = await users.findOne({username: req.user.username})
  if (loggeduser.isAdmin) {
    const findusertodelete = await users.findOne({username: account})
    if (!findusertodelete) {
      res.render(__dirname + "/views/message.ejs", { message: `<span class="material-icons">cloud_off</span>&nbsp;Account not found`,  cloudname: config.cloudname})
    } else {
      const usertodelete = await users.findOneAndRemove({ username: account})
      fs.rmdirSync(__dirname + config.uploadsfolder + `${account}/`)
      res.render(__dirname + "/views/message.ejs", {message: `<span class="material-icons">cloud_done</span>&nbsp;Account ${account} has been deleted.`,  cloudname: config.cloudname})
    }
  } else {
    res.render(__dirname + "/views/message.ejs", { message: `<span class="material-icons">cloud_off</span>&nbsp;Error 401 - Unauthorized`,  cloudname: config.cloudname})
    logger.logInfo(`${req.user.username} deleted account ${account}!`)
  }
})

// EDIT ACCOUNT

app.get("/editaccount/:account", checkAuth, checkVerify, function (req, res) {
  const account = req.params.account
  res.render(__dirname + "/views/editaccount.ejs", { account: account,  cloudname: config.cloudname})
})


app.post("/editaccount/:account", checkAuth, checkVerify, async function (req, res) {
  const account = sanitize(req.params.account)
  const newaccountname = sanitize(req.body.newname)
  const newaccountemail = sanitize(req.body.newemail)
  const loggeduser = await users.findOne({ username: req.user.username})
  if (loggeduser.isAdmin) {
    const findusertorename = await users.findOne({username: account})
    if (!findusertorename) {
      res.render(__dirname + "/views/message.ejs", { message: `<span class="material-icons">cloud_off</span>&nbsp;Account not found`,  cloudname: config.cloudname})
    } else {
    const usertorename = await users.findOneAndUpdate({username: account}, {username: newaccountname, email: newaccountemail})
    fs.renameSync(__dirname + config.uploadsfolder + `${account}/`, __dirname + config.uploadsfolder + `${newaccountname}/`)
    res.render(__dirname + "/views/message.ejs", { message: `<span class="material-icons">cloud_done</span>&nbsp;Account ${account} with ${findusertorename.email} email has been renamed to ${newaccountname} with ${newaccountemail} email`,  cloudname: config.cloudname})
    logger.logInfo(`${account} with ${findusertorename.email} email has been renamed to ${newaccountname} with ${newaccountemail} email by ${req.user.username}`)
  }
  } else {
    res.render(__dirname + "/views/message.ejs", { message: `<span class="material-icons">cloud_off</span>&nbsp;Error 401 - Unauthorized`,  cloudname: config.cloudname})
  }
})


// ADD ADMIN

app.get("/addadmin/:account", checkAuth, checkVerify, async function (req, res) {
  const account = req.params.account
  const loggeduser = await users.findOne({username: req.user.username})
  if (loggeduser.isAdmin) {
    const user = await users.findOneAndUpdate({ username: account}, {isAdmin: true})
    res.render(__dirname + "/views/message.ejs", {message: `<span class="material-icons">cloud_done</span>&nbsp;Account ${account} is now admin.`,  cloudname: config.cloudname})
    logger.logInfo(`${req.user.username} set ${account} as admin!`)
  } else {
    res.render(__dirname + "/views/message.ejs", { message: `<span class="material-icons">cloud_off</span>&nbsp;Error 401 - Unauthorized`,  cloudname: config.cloudname})
  }
})

// REMOVE ADMIN

app.get("/removeadmin/:account", checkAuth, checkVerify, async function (req, res) {
  const account = req.params.account
  const loggeduser = await users.findOne({username: req.user.username})
  if (loggeduser.isAdmin) {
    const user = await users.findOneAndUpdate({ username: account}, {isAdmin: false})
    res.render(__dirname + "/views/message.ejs", {message: `<span class="material-icons">cloud_done</span>&nbsp;Account ${account} isn't admin now.`,  cloudname: config.cloudname})
    logger.logInfo(`${req.user.username} remove admin from ${account}`)
  } else {
    res.render(__dirname + "/views/message.ejs", { message: `<span class="material-icons">cloud_off</span>&nbsp;Error 401 - Unauthorized`,  cloudname: config.cloudname})
  }
})


// UPLOAD

app.post('/upload', upload.single('file'), checkAuth, checkVerify, function (req, res) {
  const name = sanitize(req.file.originalname.replace(/ /g, "_"))
  if (removeaccents.has(name)) {
    res.send("Please upload files without accents.")
  } else {
    if (fs.readdirSync(__dirname + config.uploadsfolder + `${req.user.username}/`).includes(name)) {
      res.render(__dirname + "/views/message2.ejs", {message: `<span class="material-icons">file_copy</span>&nbsp;File ${name} already exist!`,  cloudname: config.cloudname})
    } else {
      fs.writeFile(__dirname + config.uploadsfolder + `${req.user.username}/` +  name, req.file.buffer, async  err => {
        if (err) {
          res.send(err);
        } else {
          res.render(__dirname + "/views/message2.ejs", {message: `<span class="material-icons">cloud_done</span>&nbsp;File ${name} uploaded succesfully!`,  cloudname: config.cloudname})
          const user = await users.findOne({username: req.user.username})
          user.files.push(name)
          user.save()
          logger.logInfo(`${req.user.username} uploaded ${name}!`)
        }
      });
    }
  }
});

// DOWNLOAD REDIRECT

app.get("/dwnl", checkAuth, checkVerify, function (req, res) {
  const file = req.query.downloadfile
  res.redirect("/download/" + file)
})

// DOWNLOAD

app.get('/download/:downloadfile',  checkAuth, checkVerify, (req, res) => {
  const downloadfile = sanitize(req.params.downloadfile)
  fs.readFile( __dirname + config.uploadsfolder + `${req.user.username}/` + downloadfile, (err, data) =>{
    if (err) {
      res.render(__dirname + "/views/message.ejs", {message: `<span class="material-icons">cloud_off</span>&nbsp;File ${downloadfile} not found!`,  cloudname: config.cloudname})
    } else {
      res.contentType('application/octet-stream');
      res.send(data)
      logger.logInfo(`${req.user.username} downloaded ${downloadfile}!`)
    }
  })
});

// 404  PAGE

app.get("/*", async function (req, res) {
  res.render(__dirname + "/views/message.ejs", {message: `<span class="material-icons">cloud_off</span>&nbsp;Error 404 - Page not found!`,  cloudname: config.cloudname})
})

// CHECK FOR UPDATES

updater.checkForUpdates()

app.listen(config.port, () => {
  logger.logSuccess(`Server listening on port ${config.port}`);
});
