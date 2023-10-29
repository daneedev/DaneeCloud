const axios = require("axios")
const currentversion = require("../package.json").version
const logger = require("./logger")

async function checkForUpdates() {
const response = await axios.get("https://version.daneeskripter.dev/daneecloud/version.txt")
    if (response.status == 200) {
        const stableVersion = response.data
        if (currentversion == stableVersion) {
            logger.logInfo("You are using latest version!")
        } else {
            logger.logWarn(`Please update! Current version: ${currentversion} Stable version: ${stableVersion}`)
        }
    } else {
        logger.logError("Can't check for updates.")
    }
}

module.exports.checkForUpdates = checkForUpdates