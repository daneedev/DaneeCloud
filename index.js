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
  saveUninitialized: false
}))

app.use(passport.initialize())
app.use(passport.session())

// DATABASE

const users = require("./models/users");
mongoose.connect(process.env.mongo_srv, {
}).then(() =>[
  console.log('Connected to the database!')
]).catch((err) =>{
  console.log('Failed connect to the database!')
})

app.use(express.static(__dirname + "/public/"))
app.set("view-engine", "ejs")
app.use(express.urlencoded({ extended: false}))
app.use(limiter);

app.get("/", checkAuth ,function (req, res) {
  res.render(__dirname + "/views/index.ejs" )
})

// REGISTER
app.get("/register", checkNotAuth,  function (req, res) {
  res.render(__dirname + "/views/register.ejs")
})

app.post("/register", checkNotAuth, async function (req, res) {
  try {
    const hashedPassword = await bcrypt.hash(req.body.password, 10)
    const usernameExist = await users.findOne({ username: req.body.name})
    const emailExist = await users.findOne({ email: req.body.email})
    if (usernameExist) {
      res.render(__dirname + "/views/message.ejs", { message: `<span class="material-icons">no_accounts</span>&nbsp;User with this username already exists!`})
    } else if (emailExist) { 
      res.render(__dirname + "/views/message.ejs", { message: `<span class="material-icons">cancel_schedule_send</span>&nbsp;User with this email already exists!`})
    } else {
    const user = new users({
      username: req.body.name,
      email: req.body.email,
      password: hashedPassword,
      id: Date.now().toString(),
      files: []
    })
    user.save()
    fs.mkdirSync(__dirname + "/uploads/" + req.body.name)
    res.redirect("/login")
  }
  } catch {
    res.redirect("/register")
  }
})

// LOGIN

app.get("/login", checkNotAuth, function (req, res) {
  res.render(__dirname + "/views/login.ejs")
})

app.post("/login", checkNotAuth, passport.authenticate("local", {
  successRedirect: "/",
  failureRedirect: "/login",
  failureFlash: true
}))

// LOG OUT

app.delete("/logout", (req, res) => {
  req.logOut( (err) => {
    if (err) return console.log(err)
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

app.get("/myfiles", checkAuth, async function (req, res) {
  const user = await users.findOne({username: req.user.username})
  const files = user.files
  res.render(__dirname + "/views/myfiles.ejs", {files: files})
})

// DELETE FILE

app.get("/delete/:file", checkAuth, function (req, res) {
  const file = req.params.file
  fs.readFile( __dirname + config.uploadsfolder + `${req.user.username}/` + file, async (err, data) =>{
    if (err) {
      res.render(__dirname + "/views/message.ejs", {message: `<span class="material-icons">cloud_off</span>&nbsp;File ${file} not found!`})
    } else {
      fs.unlinkSync(__dirname + config.uploadsfolder + `${req.user.username}/` + file)
      const user = await users.findOne({ username: req.user.username})
      user.files.pull(file)
      user.save()
      res.render(__dirname + "/views/message.ejs", {message: `<span class="material-icons">delete</span>&nbsp;File ${file} deleted succesfully!`})
    }
  })
})

// UPLOAD

app.post('/upload', upload.single('file'), checkAuth, function (req, res) {
  const name = sanitize(req.file.originalname.replace(" ", "_"))
  if (removeaccents.has(name)) {
    res.send("Please upload files without accents.")
  } else {
    if (fs.readdirSync(__dirname + "/uploads/" + `${req.user.username}/`).includes(name)) {
      res.render(__dirname + "/views/message.ejs", {message: `<span class="material-icons">file_copy</span>&nbsp;File ${name} already exist!`})
    } else {
      fs.writeFile(__dirname + config.uploadsfolder + `${req.user.username}/` +  name, req.file.buffer, async  err => {
        if (err) {
          res.send(err);
        } else {
          res.render(__dirname + "/views/message.ejs", {message: `<span class="material-icons">cloud_done</span>&nbsp;File ${name} uploaded succesfully!`})
          const user = await users.findOne({username: req.user.username})
          user.files.push(name)
          user.save()
        }
      });
    }
  }
});

// DOWNLOAD REDIRECT

app.get("/dwnl", checkAuth, function (req, res) {
  const file = req.query.downloadfile
  res.redirect("/download/" + file)
})

// DOWNLOAD

app.get('/download/:downloadfile',  checkAuth, (req, res) => {
  const downloadfile = sanitize(req.params.downloadfile)
  fs.readFile( __dirname + config.uploadsfolder + `${req.user.username}/` + downloadfile, (err, data) =>{
    if (err) {
      res.render(__dirname + "/views/message.ejs", {message: `<span class="material-icons">cloud_off</span>&nbsp;File ${downloadfile} not found!`})
    } else {
      res.contentType('application/octet-stream');
      res.send(data)
      if (config.deleteafterdownload == true) {
        fs.unlinkSync(__dirname + config.uploadsfolder + downloadfile)
      }
    }
  })
});

app.listen(config.port, () => {
  console.log(`Server listening on port ${config.port}`);
});

