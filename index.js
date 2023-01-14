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
const logger = require("./logger")
const updater = require("./updater")
const osu = require("node-os-utils")
const ms = require("ms")
app.use(methodOverride("_method"))

if (process.env.NODE_ENV !== "production") {
  require("dotenv").config()
}

// PASSPORT & SESSION
const initializePassport = require("./passportconfig")
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
  message: 'Too many accounts created from this IP, please try again after an 15 minutes',
  max: 300
})

app.get("/files/:username/:file", AuthLimiter, checkAuth, checkVerify, limiter, function (req, res) {
  if (req.params.username == req.user.username) {
    const file = sanitize(req.params.file)
    if (fs.readdirSync(__dirname + config.uploadsfolder + `${sanitize(req.params.username)}/`).includes(file)) {
      const requestedfile = fs.readFileSync(__dirname + config.uploadsfolder + `${sanitize(req.params.username)}/` + file)
      if (isimg(__dirname + config.uploadsfolder + `${sanitize(req.params.username)}/` + file)) {
        res.setHeader("Content-Type", "image/png");
      }
      res.send(requestedfile)
    } else {
      res.render(__dirname + "/views/message.ejs", {message: `<span class="material-icons">cloud_off</span>&nbsp;File ${file} not found!`,  cloudname: config.cloudname})
    }
  } else {
    res.render(__dirname + "/views/message.ejs", { message: `<span class="material-icons">cloud_off</span>&nbsp;Error 401 - Unauthorized`,  cloudname: config.cloudname})
  }
})


app.use("/files/", AuthLimiter, checkAuth, checkVerify, express.static(__dirname + "/uploads/"))
app.set("view-engine", "ejs")
app.use(express.urlencoded({ extended: false}))

app.get("/", checkAuth , checkVerify, async function (req, res) {
  const user = await users.findOne({username: req.user.username})
  let isAdmin;
  if (user.isAdmin == true) {
    isAdmin = true
  } else {
    isAdmin = false
  }
  res.render(__dirname + "/views/index.ejs", {isAdmin: isAdmin, username: req.user.username, cloudname: config.cloudname} )
})

// REGISTER
app.get("/register", checkNotAuth,  function (req, res) {
  res.render(__dirname + "/views/register.ejs", { cloudname: config.cloudname})
})

app.post("/register", checkNotAuth, async function (req, res) {
  try {
    const hashedPassword = await bcrypt.hash(req.body.password, 10)
    const usernameExist = await users.findOne({ username: req.body.name})
    const emailExist = await users.findOne({ email: req.body.email})
    if (usernameExist) {
      res.render(__dirname + "/views/message.ejs", { message: `<span class="material-icons">no_accounts</span>&nbsp;User with this username already exists!`,  cloudname: config.cloudname})
    } else if (emailExist) { 
      res.render(__dirname + "/views/message.ejs", { message: `<span class="material-icons">cancel_schedule_send</span>&nbsp;User with this email already exists!`,  cloudname: config.cloudname})
    } else {
    const user = new users({
      username: req.body.name,
      email: req.body.email,
      password: hashedPassword,
      id: Date.now().toString(),
      files: [],
      isAdmin: false,
      isVerified: false,
      verifyCode: null,
      sharedFiles: []
    })
    user.save()
    fs.mkdirSync(__dirname + "/uploads/" + sanitize(req.body.name))
    logger.logInfo(`User ${req.body.name} has been registered!`)
    res.redirect("/login")
  }
  } catch (err) {
    logger.logError(`There is an error with registration: ${err}`)
    res.redirect("/register")
  }
})

// LOGIN

app.get("/login", checkNotAuth, function (req, res) {
  res.render(__dirname + "/views/login.ejs", { cloudname: config.cloudname })
})

app.post("/login", checkNotAuth, passport.authenticate("local", {
  successRedirect: "/",
  failureRedirect: "/login",
  failureFlash: true
}))

// CHECK IF USER IS VERIFIED

async function checkVerify(req, res, next) {
  const user = await users.findOne({username: req.user.username})
  if (user.isVerified == true) {
    return next()
  } else {
    res.redirect("/verify")
  }
}

// CHECK IF USER IS NOT VERIFIED

async function checkNotVerify(req, res, next) {
  const user = await users.findOne({username: req.user.username})
  if (user.isVerified == true) {
    res.redirect("/")
  } else {
    next()
  }
}


// SHARED FILES

app.get("/sf/:username/:file", async function (req, res) {
  const user = await users.findOne({username: req.params.username})
  if (!user) {
    res.render(__dirname + "/views/message.ejs", { cloudname: config.cloudname, message: `<span class="material-icons">cloud_off</span>&nbsp;No account with this username!`})
  } else if (!user.sharedFiles.includes(req.params.file)) {
    res.render(__dirname + "/views/message.ejs", { cloudname: config.cloudname, message: `<span class="material-icons">cloud_off</span>&nbsp;No shared file found!`})
  } else {
    fs.readFile( __dirname + config.uploadsfolder + `${sanitize(req.params.username)}/` + sanitize(req.params.file), (err, data) => {
      if (err) {
        logger.logError(err)
      } else {
        res.contentType('application/octet-stream');
        res.send(data)
        logger.logInfo(`Someone downloaded ${req.params.file} from ${req.params.username}`)
      }
    })
  }
})

app.get("/addsf/:file",  checkAuth, checkVerify, async function (req, res) {
  const file = req.params.file
  const user = await users.findOne({username: req.user.username})
  if (user.sharedFiles.includes(file)) {
    res.render(__dirname + "/views/message.ejs", { cloudname: config.cloudname, message: `<span class="material-icons">cloud_off</span>&nbsp;This file is already shared!`})
  } else {
    user.sharedFiles.push(file)
    user.save()
    res.render(__dirname + "/views/message.ejs", { cloudname: config.cloudname, message: `<span class="material-icons">cloud_done</span>&nbsp;File ${file} has been set as shared! <a href=${config.cloudurl}/sf/${req.user.username}/${file}>Link</a>`})
    logger.logInfo(`${req.user.username} shared ${file}!`)
  }
})

app.get("/rmsf/:file", checkAuth, checkVerify, async function (req, res) {
  const file = req.params.file
  const user = await users.findOne({username: req.user.username})
  if (!user.sharedFiles.includes(file)) {
    res.render(__dirname + "/views/message.ejs", { cloudname: config.cloudname, message: `<span class="material-icons">cloud_off</span>&nbsp;File ${file} isnt shared!`})
  } else {
    user.sharedFiles.pull(file)
    user.save()
    res.render(__dirname + "/views/message.ejs", { cloudname: config.cloudname, message: `<span class="material-icons">cloud_done</span>&nbsp;File ${file} has been set as not shared!`})
    logger.logInfo(`${req.user.username} set ${file} as not shared!`)
  }
})

// EMAIL VERIFY
const { transporter} = require("./smtpconfig")

app.get("/verify", checkAuth, checkNotVerify, function (req, res) {
    res.render(__dirname + "/views/verify.ejs", { cloudname: config.cloudname, req: req})
})

app.post("/verify", checkAuth, checkNotVerify, async function (req, res) {
  const verifycode = Math.floor(Math.random() * 9000) + 1000
  const addverifycode = await users.findOneAndUpdate({username: req.user.username}, {verifyCode: verifycode.toString()}) 
  transporter.sendMail({
  from: {
  name: config.cloudname + " | Verify",
  address: "verify@" + config.cloudurl.split("https://")[1]
  },
  to: req.user.email,
  subject: "Verify your account",
  text: "Hello,\n please verify your account with this code: " + verifycode.toString() + "\n If you didn't registered on " + config.cloudurl + ", ignore this mail.\nThe code will expire in next 10 minutes.\n\n\nRegards,\nVerification bot from " + config.cloudname
  }, function (error, info) {
  if (error) {
  logger.logError(error)
  } else {
    logger.logInfo("Verification email has been sent to " + req.user.email)
    setTimeout(async () => {
      const removeverifycode = await users.findOneAndUpdate({username: req.user.username}, {verifyCode: null})
    }, 600000);
  }
  })
  res.redirect("/verifycode")

})

app.get("/verifycode", checkAuth, checkNotVerify, function (req, res) {
  res.render(__dirname + "/views/verifycode.ejs", { cloudname: config.cloudname})
})

app.post("/verifycode", checkAuth, checkNotVerify, async function (req, res) {
  const user = await users.findOne({ username: req.user.username})
  if (user.verifyCode == req.body.code) {
    const verifyuser = await users.findOneAndUpdate({username: req.user.username}, { isVerified: true})
    res.render(__dirname + "/views/message.ejs", { cloudname: config.cloudname, message: `<span class="material-icons">verified</span>&nbsp;Your account has been successfully verified!`})
    logger.logInfo("User " + req.user.username + " has been successfully verified!")
  } else {
    res.redirect("/verifycode")
  }
})

// LOG OUT

app.delete("/logout", (req, res) => {
  req.logOut( (err) => {
    if (err) return logger.logError(err)
  })
  res.redirect("/login")
})

// CHECK IF USER IS LOGGED IN

function checkAuth(req, res, next) {
  if (req.isAuthenticated()) {
    return next()
  }

  res.redirect("/login")
}

// CHECK IF USER IS NOT LOGGED IN

function checkNotAuth(req, res, next) {
  if (req.isAuthenticated()) {
    return res.redirect("/")
  }
  next()
}

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
  const newname = sanitize(req.body.newname)
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
