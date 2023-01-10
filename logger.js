const colors = require("colors")
const config = require("./config.json")
const fs = require('fs');

function logSuccess(message) {
    const date = new Date
    date.setTime(date.getTime())
    const seconds = date.getSeconds()
    const minutes = date.getMinutes()
    const hours = date.getHours()
    if (config.logtofile) {
        fs.appendFileSync(__dirname + "/logs/app.log", `\n[${hours}:${minutes}:${seconds}] ` + "[SUCCESS] " +  message)
    }
    console.log(`[${hours}:${minutes}:${seconds}] ` + colors.green("[SUCCESS] ") +  message)
}

function logError(message) {
    const date = new Date
    date.setTime(date.getTime())
    const seconds = date.getSeconds()
    const minutes = date.getMinutes()
    const hours = date.getHours()
    if (config.logtofile) {
        fs.appendFileSync(__dirname + "/logs/app.log", `\n[${hours}:${minutes}:${seconds}] ` + "[ERROR] " + colors.red(message))
    }
    console.log(`[${hours}:${minutes}:${seconds}] ` + colors.red("[ERROR] ") + colors.red(message))
}

function logInfo(message) {
    const date = new Date
    date.setTime(date.getTime())
    const seconds = date.getSeconds()
    const minutes = date.getMinutes()
    const hours = date.getHours()
    if (config.logtofile) {
        fs.appendFileSync(__dirname + "/logs/app.log", `\n[${hours}:${minutes}:${seconds}] ` + "[INFO] " + message)
    }
    console.log(`[${hours}:${minutes}:${seconds}] ` + colors.blue("[INFO] ") + message)
}

module.exports.logSuccess = logSuccess
module.exports.logError = logError
module.exports.logInfo = logInfo