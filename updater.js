const request = require("request")
const currentversion = require("./package.json").version
const logger = require("./logger")

function checkForUpdates() {
request.get("https://version.daneeskripter.tk/daneecloud/version.txt", function (error, response, body) {
    if (!error && response.statusCode == 200) {
        const stableVersion = body
        if (currentversion == stableVersion) {
            logger.logInfo("You are using latest version!")
        } else {
            logger.logWarn(`Please update! Current version: ${currentversion} Stable version: ${stableVersion}`)
        }
    } else {
        logger.logError("Can't check for updates.")
    }
})
}

module.exports.checkForUpdates = checkForUpdates