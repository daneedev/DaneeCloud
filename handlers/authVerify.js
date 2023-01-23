const users = require("../models/users");

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

  module.exports.checkAuth = checkAuth
  module.exports.checkNotAuth = checkNotAuth
  module.exports.checkVerify = checkVerify
  module.exports.checkNotVerify = checkNotVerify