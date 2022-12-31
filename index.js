const express = require('express');
const multer = require('multer');
const fs = require('fs');
const removeaccents = require("remove-accents")
const app = express();
const storage = multer.memoryStorage()
const upload = multer({ storage: storage })
var RateLimit = require('express-rate-limit');
var limiter = RateLimit({
  windowMs: 1*60*1000, // 1 minute
  max: 60
});
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

app.get("/files/:username/:file", checkAuth, checkVerify, limiter, function (req, res) {
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


app.use("/files/", checkAuth, checkVerify, limiter, express.static(__dirname + "/uploads/"))
app.set("view-engine", "ejs")
app.use(express.urlencoded({ extended: false}))
app.use(limiter);





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
      verifyCode: null
    })
    user.save()
    fs.mkdirSync(__dirname + "/uploads/" + sanitize(req.body.name))
    res.redirect("/login")
  }
  } catch {
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
  address: "verify@cloud.daneeskripter.tk"
  },
  to: req.user.email,
  subject: "Verify your account",
  text: "Hello,\n please verify your account with this code: " + verifycode.toString() + "\n If you didn't registered on " + config.cloudurl + ", ignore this mail.\n\n\nRegards,\nVerification bot from " + config.cloudname
  }, function (error, info) {
  if (error) {
  logger.logError(error)
  } else {
    logger.logInfo("Verification email has been sent to " + req.user.email)
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
  res.render(__dirname + "/views/myfiles.ejs", {files: files,  cloudname: config.cloudname, fs: fs, config: config, req: req, __dirname: __dirname, isImg: isimg, Buffer: Buffer})
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
      user.save()
      res.redirect("/myfiles")
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
  user.save()
  res.render(__dirname + "/views/message.ejs", {message: `<span class="material-icons">cloud_done</span>&nbsp;File ${oldname} has been renamed to ${newname}`,  cloudname: config.cloudname})
})

// ADMIN PANEL

app.get("/admin/", checkAuth, checkVerify, async function (req, res) {
  const user = await users.findOne({ username: req.user.username})
  const allusers = await users.find()
  if (user.isAdmin) {
    res.render(__dirname + "/views/admin.ejs", {users: allusers,  cloudname: config.cloudname})
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
      res.render(__dirname + "/views/message.ejs", {message: `<span class="material-icons">file_copy</span>&nbsp;File ${name} already exist!`,  cloudname: config.cloudname})
    } else {
      fs.writeFile(__dirname + config.uploadsfolder + `${req.user.username}/` +  name, req.file.buffer, async  err => {
        if (err) {
          res.send(err);
        } else {
          res.render(__dirname + "/views/message.ejs", {message: `<span class="material-icons">cloud_done</span>&nbsp;File ${name} uploaded succesfully!`,  cloudname: config.cloudname})
          const user = await users.findOne({username: req.user.username})
          user.files.push(name)
          user.save()
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
    }
  })
});

// 404  PAGE

app.get("/*", async function (req, res) {
  res.render(__dirname + "/views/message.ejs", {message: `<span class="material-icons">cloud_off</span>&nbsp;Error 404 - Page not found!`,  cloudname: config.cloudname})
})

app.listen(config.port, () => {
  logger.logSuccess(`Server listening on port ${config.port}`);
});
