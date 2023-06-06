const express = require('express');
const app = express();
var RateLimit = require('express-rate-limit');
const config = require("./config.json")
const mongoose = require("mongoose")
const passport = require("passport")
const flash = require("express-flash")
const session = require("cookie-session")
const methodOverride = require("method-override")
const logger = require("./handlers/logger")
const updater = require("./handlers/updater")
app.use(methodOverride("_method"))
const {checkAuth, checkNotAuth, checkVerify, checkNotVerify} = require("./handlers/authVerify")
const roles = require("./models/roles")
const csurf = require("tiny-csrf");
const cookieParser = require("cookie-parser")
const lang = require("./lang/default.json")

if (process.env.NODE_ENV !== "production") {
  require("dotenv").config()
}

const domain = config.cloudurl.split("//")
// PASSPORT & SESSION
const initializePassport = require("./handlers/passportconfig")
initializePassport(passport)
app.use(flash())
app.use(session({
  name: "logincookie",
  keys: [process.env.SESSION_SECRET],
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: true,
    httpOnly: true,
    domain: domain[1],
    maxAge: 86400000
  }
}))

app.use(cookieParser(process.env.SESSION_SECRET));
app.use(express.urlencoded({ extended: false}))

app.use(passport.initialize())
app.use(passport.session())

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

// API

app.use("/api/", require("./routes/api").api)

app.use("/", require("./routes/home"))

// UPLOAD

app.use("/upload/", require("./routes/upload"))

app.use(csurf(
  process.env.CSRF_TOKEN
  ));

// DATABASE

const users = require("./models/users");
mongoose.connect(process.env.mongo_srv, {
}).then(() =>[
  logger.logSuccess("Connected to the database!")
]).catch((err) =>{
  logger.logError('Failed connect to the database!')
})

app.use("/addapikey/", require("./routes/api").addkey)

app.use("/delapikey/", require("./routes/api").delkey)

app.use("/files/", require("./routes/files"))

app.use('/favicon.ico', express.static( __dirname + "/img/daneecloudfavicon.png"));


app.use("/files/", AuthLimiter, checkAuth, checkVerify, express.static(__dirname + "/uploads/"))
app.set("view-engine", "ejs")


// REGISTER
app.use("/register", require("./routes/register"))

// LOGIN

app.use("/login", require("./routes/login"))

// SHARED FILES

app.use("/sf/", require("./routes/sharedFiles").sf)

app.use("/addsf/", require("./routes/sharedFiles").addsf)

app.use("/rmsf/", require("./routes/sharedFiles").rmsf)

// PLAY VIDEO

app.use("/playvideo/", require("./routes/vidplayer").player)

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

app.use("/myfiles", require("./routes/filemgr").myfiles)

// DELETE FILE

app.use("/delete/", require("./routes/filemgr").del)

// RENAME FILE

app.use("/rename/", require("./routes/filemgr").ren)

// ADMIN PANEL

app.use("/admin/", require("./routes/admin").admin)

// DELETE ACCOUNT

app.use("/deleteaccount/", require("./routes/admin").del)

// EDIT ACCOUNT

app.use("/editaccount/", require("./routes/admin").edit)


// DOWNLOAD REDIRECT

app.use("/dwnl/", require("./routes/download").dwnl)

// DOWNLOAD

app.use("/download/", require("./routes/download").download)

app.use("/downloadf/", require("./routes/download").downloadf)

// ROLES

app.use("/updaterole/", require("./routes/roles").updaterole)

app.use("/addrole/", require("./routes/roles").addrole)

app.use("/delrole/", require("./routes/roles").delrole)

app.use("/editrole/", require("./routes/roles").editrole)

// AUDIO PLAYER

app.use("/playaudio/", require("./routes/audioplayer"))

// ADD SUBTITLES

app.use("/addsubtitles/", require("./routes/vidplayer").subtitles)

// REMOVE SUBTITLES

app.use("/rmsubtitles/", require("./routes/vidplayer").rmsubtitles)

// ACCOUNT MANAGMENT

app.use("/editmyaccount/", require("./routes/accountmgr").edit)

app.use("/delmyaccount/", require("./routes/accountmgr").delete)

// MY PROFILE
app.use("/myprofile", require("./routes/accountmgr").myprofile)

// CREATE FOLDER
app.use("/createfolder", require("./routes/filemgr").createfolder)

// 404  PAGE

app.get("/*", async function (req, res) {
  res.render(__dirname + "/views/message.ejs", {message: `<span class="material-icons">cloud_off</span>&nbsp;${lang["Error404"]}`,  cloudname: config.cloudname, lang: lang})
})

// CHECK IF DEFAULT ROLES ARE IN DB
async function roleCheck() {
const findUserRole = await roles.findOne({name: "user"})
const findAdminRole = await roles.findOne({name: "admin"})

if (!findUserRole) {
  const userRole = new roles({
    name: "user",
    maxStorage: 128
  })
  userRole.save()
  logger.logWarn("There wasn't role in database for user, so I created one.")
}  
if (!findAdminRole) {
  const adminRole = new roles({
    name: "admin",
    maxStorage: 256
  })
  adminRole.save()
  logger.logWarn("There wasn't role in database for admin, so I created one.")
}
}

roleCheck()
// CHECK FOR UPDATES

updater.checkForUpdates()

app.listen(config.port, () => {
  logger.logSuccess(`Server listening on port ${config.port}`);
});
