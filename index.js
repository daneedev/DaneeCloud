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
// PASSPORT & SESSION

const initializePassport = require("./passportconfig")
initializePassport(passport)
app.use(flash())
app.use(session())

// DATABASE

const users = require("./models/users");
const passport = require('passport');
mongoose.connect(config.mongo_srv, {
}).then(() =>[
  console.log('Connected to the database!')
]).catch((err) =>{
  console.log('Failed connect to the database!')
})

app.use(express.static(__dirname + "/public/"))
app.set("view-engine", "ejs")
app.use(express.urlencoded({ extended: false}))
app.use(limiter);

app.get("/", function (req, res) {
  res.render(__dirname + "/views/index.ejs" )
})

app.get("/register", function (req, res) {
  res.render(__dirname + "/views/register.ejs")
})

app.get("/login", function (req, res) {
  res.render(__dirname + "/views/login.ejs")
})

app.post("/register", async function (req, res) {
  try {
    const hashedPassword = await bcrypt.hash(req.body.password, 10)
    const user = new users({
      username: req.body.name,
      email: req.body.email,
      password: hashedPassword
    })
    user.save()
    res.redirect("/login")
  } catch {
    res.redirect("/register")
  }
})


app.post('/upload', upload.single('file'), function (req, res) {
  const name = sanitize(req.file.originalname.replace(" ", "_"))
  if (removeaccents.has(name)) {
    res.send("Please upload files without accents.")
  } else {
    fs.writeFile(__dirname + config.uploadsfolder + name, req.file.buffer, err => {
      if (err) {
        res.send(err);
      } else {
        const html = `<!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8">
            <meta http-equiv="X-UA-Compatible" content="IE=edge">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <link rel="stylesheet" href="../css//style.css">
            <link href="https://fonts.googleapis.com/icon?family=Material+Icons"
              rel="stylesheet">
              <link rel="preconnect" href="https://fonts.googleapis.com">
        <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
        <link href="https://fonts.googleapis.com/css2?family=Montserrat&display=swap" rel="stylesheet">
            <title>DaneeCloud - Uploaded successfully</title>
        <style>body {
            background-color: #d2d3db;
            padding: 0;
            margin: 0;
        }
        

        
        h1 {
            color: #5D3FD3;
            position: absolute;
            margin: auto;
            display: flex;
            left: 0;
            right: 0;
            bottom: 45%;
            top: 0;
            justify-content: center;
            align-items: center;
            font-family: "Montserrat", sans-serif;
            font-size: xxx-large;
        
        }
        h2 {
            color: #5D3FD3;
            position: absolute;
            margin: auto;
            display: flex;
            left: 0;
            right: 0;
            bottom: 40%;
            top: 0;
            justify-content: center;
            align-items: center;
            font-family: "Montserrat", sans-serif;
            font-size: x-large;
        
        }
      
      h3 {
          color: #5D3FD3;
          position: absolute;
          margin: auto;
          display: flex;
          left: 0;
          right: 0;
          bottom: 30%;
          top: 0;
          justify-content: center;
          align-items: center;
          font-family: "Montserrat", sans-serif;
          font-size: large;
      
      }
      input[type="submit"] {
        color: white;
        height: 60px;
        width: 250px;
        background-color: #5D3FD3;
        position: absolute;
        margin: auto;
        top: 0;
        bottom: 20%;
        left: 0;
        right: 0;
        font-size: 20px;
        display: flex;
        justify-content: center;
        align-items: center;
        cursor: pointer;
        font-family: "Montserrat", sans-serif;
        border-radius: 24px;
        transition-duration: 0.4s;
        border:0cm
    }
    
    input[type="submit"]:hover {
        color: #5D3FD3;
        height: 60px;
        width: 250px;
        background-color: white;
        position: absolute;
        margin: auto;
        top: 0;
        bottom: 20%;
        left: 0;
        right: 0;
        font-size: 20px;
        display: flex;
        justify-content: center;
        align-items: center;
        cursor: pointer;
        font-family: "Montserrat", sans-serif;
        border-radius: 24px;
        transition-duration: 0.4s;
        border:0cm
    }
    .footer {
      position: fixed;
      padding: 10px 10px 0px 10px;
      bottom: 0;
      width: 100%;
      /* Height of the footer*/
      height: 40px;
      background: black;
      color: white;
      font-family: "Montserrat", sans-serif;
      text-align: center;
  }
        </style>
        
        </head>
        <body>
            <h1>DaneeCloud</h1>
            <h2>Upload your files!</h2>
            <h3><span class="material-icons">cloud_done</span>&nbsp;File ${name} uploaded succesfully!</h3>
            <form action="/">
            <input type="submit" href="/" value="Back to home page"></input>
            </form>
            <footer>
            <div class="footer">DaneeSkripter © 2022 - All rights reserved</div>
        
        </footer>
        </body>
        </html>`
        res.send(html)
      }
    });
  }
});

app.get("/dwnl", function (req, res) {
  const file = req.query.downloadfile
  res.redirect("/download/" + file)
})

// This route will serve the uploaded files
app.get('/download/:downloadfile',  (req, res) => {
  const downloadfile = sanitize(req.params.downloadfile)
 const html = `<!DOCTYPE html>
 <html lang="en">
 <head>
     <meta charset="UTF-8">
     <meta http-equiv="X-UA-Compatible" content="IE=edge">
     <meta name="viewport" content="width=device-width, initial-scale=1.0">
     <link rel="stylesheet" href="../css//style.css">
     <link href="https://fonts.googleapis.com/icon?family=Material+Icons"
       rel="stylesheet">
       <link rel="preconnect" href="https://fonts.googleapis.com">
 <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
 <link href="https://fonts.googleapis.com/css2?family=Montserrat&display=swap" rel="stylesheet">
     <title>DaneeCloud - File Not Found</title>
 <style>body {
     background-color: #d2d3db;
     padding: 0;
     margin: 0;
 }
 

 
 h1 {
     color: #5D3FD3;
     position: absolute;
     margin: auto;
     display: flex;
     left: 0;
     right: 0;
     bottom: 45%;
     top: 0;
     justify-content: center;
     align-items: center;
     font-family: "Montserrat", sans-serif;
     font-size: xxx-large;
 
 }
 h2 {
     color: #5D3FD3;
     position: absolute;
     margin: auto;
     display: flex;
     left: 0;
     right: 0;
     bottom: 40%;
     top: 0;
     justify-content: center;
     align-items: center;
     font-family: "Montserrat", sans-serif;
     font-size: x-large;
 
 }

h3 {
   color: #5D3FD3;
   position: absolute;
   margin: auto;
   display: flex;
   left: 0;
   right: 0;
   bottom: 30%;
   top: 0;
   justify-content: center;
   align-items: center;
   font-family: "Montserrat", sans-serif;
   font-size: large;

}
input[type="submit"] {
 color: white;
 height: 60px;
 width: 250px;
 background-color: #5D3FD3;
 position: absolute;
 margin: auto;
 top: 0;
 bottom: 20%;
 left: 0;
 right: 0;
 font-size: 20px;
 display: flex;
 justify-content: center;
 align-items: center;
 cursor: pointer;
 font-family: "Montserrat", sans-serif;
 border-radius: 24px;
 transition-duration: 0.4s;
 border:0cm
}

input[type="submit"]:hover {
 color: #5D3FD3;
 height: 60px;
 width: 250px;
 background-color: white;
 position: absolute;
 margin: auto;
 top: 0;
 bottom: 20%;
 left: 0;
 right: 0;
 font-size: 20px;
 display: flex;
 justify-content: center;
 align-items: center;
 cursor: pointer;
 font-family: "Montserrat", sans-serif;
 border-radius: 24px;
 transition-duration: 0.4s;
 border:0cm
}
.footer {
  position: fixed;
  padding: 10px 10px 0px 10px;
  bottom: 0;
  width: 100%;
  /* Height of the footer*/
  height: 40px;
  background: black;
  color: white;
  font-family: "Montserrat", sans-serif;
  text-align: center;
}
 </style>
 
 </head>
 <body>
     <h1>DaneeCloud</h1>
     <h2>Upload your files!</h2>
     <h3><span class="material-icons">cloud_off</span>&nbsp;File ${downloadfile} not found</h3>
     <form action="/">
     <input type="submit" href="/" value="Back to home page"></input>
     </form>
     <footer>
     <div class="footer">DaneeSkripter © 2022 - All rights reserved</div>
 
 </footer>
 </body>
 </html>`
  fs.readFile( __dirname + config.uploadsfolder + downloadfile, (err, data) =>{
    if (err) {
      res.send(html)
    } else {
      res.contentType('application/octet-stream');
      res.send(data)
      if (config.deleteafterdownload == true) {
        fs.unlinkSync(__dirname + config.uploadsfolder + downloadfile)
      }
    }
  })
});

// Start the server on port 3000
app.listen(config.port, () => {
  console.log(`Server listening on port ${config.port}`);
});

