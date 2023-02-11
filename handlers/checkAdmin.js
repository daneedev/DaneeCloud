const users = require("../models/users")

async function checkAdmin(req, res, next) {
    const user = await users.findOne({username: req.user.username})
    if (user.role == "admin") {
        next()
    } else {
        res.render(__dirname + "/../views/message.ejs", { message: `<span class="material-icons">cloud_off</span>&nbsp;Error 401 - Unauthorized`,  cloudname: config.cloudname})
    }
}

module.exports.checkAdmin = checkAdmin