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

app.use(limiter);

app.get("/", function (req, res) {
  res.sendFile(__dirname + "/html/index.html" )
})


app.post('/upload', upload.single('file'), function (req, res) {
  const name = req.file.originalname.replace(" ", "_")
  if (removeaccents.has(name)) {
    res.send("Please upload files without accents.")
  } else {
    fs.writeFile(__dirname + "/uploads/" + name, req.file.buffer, err => {
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
            <title>DaneeCloud</title>
        <style>body {
            background-color: whitesmoke;
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
        </style>
        
        </head>
        <body>
            <h1>DaneeCloud</h1>
            <h2>Upload your files!</h2>
            <h3><span class="material-icons">cloud_done</span>&nbsp;File ${name} uploaded succesfully!</h3>
            <form action="/">
            <input type="submit" href="/" value="Back to home page"></input>
            </form>
        </body>
        </html>`
        res.send(html)
      }
    });
  }
});

// This route will serve the uploaded files
app.get('/download/:filename', (req, res) => {
  // The filename is available in the `req.params` object
  fs.readFile(__dirname + "/uploads/" + req.params.filename, (err, data) => {
    if (err) {
      res.send("No file exist with this name!")
    } else {
      res.contentType('application/octet-stream');
      res.send(data);
    }
  });
});

// Start the server on port 3000
app.listen(3000, () => {
  console.log('Server listening on port 3000');
});

