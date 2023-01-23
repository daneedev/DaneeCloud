const colors = require("colors")
const config = require("../config.json")
const fs = require('fs');

function addZero(i) {
    if (i < 10) {i = "0" + i}
    return i;
  }

function logSuccess(message) {
    const date = new Date
    date.setTime(date.getTime())
    const seconds = date.getSeconds()
    const minutes = date.getMinutes()
    const hours = date.getHours()
    const day = date.getDate()
    const month = date.getMonth() + 1
    const year = date.getFullYear()
    if (config.logtofile) {
        fs.appendFileSync(__dirname + "/../logs/app.log", `\n[${addZero(day)}.${addZero(month)}.${year} | ${addZero(hours)}:${addZero(minutes)}:${addZero(seconds)}] ` + "[SUCCESS] " +  message)
    }
    console.log(`[${addZero(day)}.${addZero(month)}.${year} | ${addZero(hours)}:${addZero(minutes)}:${addZero(seconds)}] ` + colors.green("[SUCCESS] ") +  message)
}

function logError(message) {
    const date = new Date
    date.setTime(date.getTime())
    const seconds = date.getSeconds()
    const minutes = date.getMinutes()
    const hours = date.getHours()
    const day = date.getDate()
    const month = date.getMonth() + 1
    const year = date.getFullYear()
    if (config.logtofile) {
        fs.appendFileSync(__dirname + "/../logs/app.log", `\n[${addZero(day)}.${addZero(month)}.${year} | ${addZero(hours)}:${addZero(minutes)}:${addZero(seconds)}] ` + "[ERROR] " + colors.red(message))
    }
    console.log(`[${addZero(day)}.${addZero(month)}.${year} | ${addZero(hours)}:${addZero(minutes)}:${addZero(seconds)}] ` + colors.red("[ERROR] ") + colors.red(message))
}

function logInfo(message) {
    const date = new Date
    date.setTime(date.getTime())
    const seconds = date.getSeconds()
    const minutes = date.getMinutes()
    const hours = date.getHours()
    const day = date.getDate()
    const month = date.getMonth() + 1
    const year = date.getFullYear()
    if (config.logtofile) {
        fs.appendFileSync(__dirname + "/../logs/app.log", `\n[${addZero(day)}.${addZero(month)}.${year} | ${addZero(hours)}:${addZero(minutes)}:${addZero(seconds)}] ` + "[INFO] " + message)
    }
    console.log(`[${addZero(day)}.${addZero(month)}.${year} | ${addZero(hours)}:${addZero(minutes)}:${addZero(seconds)}] ` + colors.blue("[INFO] ") + message)
}

function logWarn(message) {
    const date = new Date
    date.setTime(date.getTime())
    const seconds = date.getSeconds()
    const minutes = date.getMinutes()
    const hours = date.getHours()
    const day = date.getDate()
    const month = date.getMonth() + 1
    const year = date.getFullYear()
    if (config.logtofile) {
        fs.appendFileSync(__dirname + "/../logs/app.log", `\n[${addZero(day)}.${addZero(month)}.${year} | ${addZero(hours)}:${addZero(minutes)}:${addZero(seconds)}] ` + "[WARN] " + message)
    }
    console.log(`[${addZero(day)}.${addZero(month)}.${year} | ${addZero(hours)}:${addZero(minutes)}:${addZero(seconds)}] ` + colors.yellow("[WARN] ") + message)
}

module.exports.logSuccess = logSuccess
module.exports.logError = logError
module.exports.logInfo = logInfo
module.exports.logWarn = logWarn