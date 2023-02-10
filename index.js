const express = require('express');
const app = express();
var RateLimit = require('express-rate-limit');
const config = require("./config.json")
const mongoose = require("mongoose")
const passport = require("passport")
const flash = require("express-flash")
const session = require("express-session")
const methodOverride = require("method-override")
const logger = require("./handlers/logger")
const updater = require("./handlers/updater")
app.use(methodOverride("_method"))
const {checkAuth, checkNotAuth, checkVerify, checkNotVerify} = require("./handlers/authVerify")
const roles = require("./models/roles")

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

// ADD ADMIN

app.use("/addadmin/", require("./routes/admin").addadmin)

// REMOVE ADMIN

app.use("/removeadmin/", require("./routes/admin").remadmin)


// UPLOAD

app.use("/upload/", require("./routes/upload"))

// DOWNLOAD REDIRECT

app.use("/dwnl/", require("./routes/download").dwnl)

// DOWNLOAD

app.use("/download/", require("./routes/download").download)

// 404  PAGE

app.get("/*", async function (req, res) {
  res.render(__dirname + "/views/message.ejs", {message: `<span class="material-icons">cloud_off</span>&nbsp;Error 404 - Page not found!`,  cloudname: config.cloudname})
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
}  
if (!findAdminRole) {
  const adminRole = new roles({
    name: "admin",
    maxStorage: 256
  })
  adminRole.save()
}
}

roleCheck()
// CHECK FOR UPDATES

updater.checkForUpdates()

app.listen(config.port, () => {
  logger.logSuccess(`Server listening on port ${config.port}`);
});
