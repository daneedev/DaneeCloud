const express = require("express") 
const router = express.Router()
const users = require("../models/users");
const config = require("../config.json")
const logger = require("../handlers/logger")
const fs = require("fs")
const sanitize = require("sanitize-filename")
const apiKeys = require("../models/apiKeys")
const bcrypt = require("bcrypt")
const config = require("../config.json")
const roles = require("../models/roles")

router.use(function (req, res, next) {
    res.header('Access-Control-Allow-Origin', '*')
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, API-Key')
  next()
})

async function keyAuth(req, res, next) {
    const APIKey = req.get("API-Key")
    const findAPIKey = await apiKeys.findOne({apiKey: APIKey})
    if (findAPIKey) {
        next()
    } else {
        res.status(401).json({error: "Error 401 - Unauthorized"})
    }
}

// API: USER

router.get("/user", keyAuth, async function (req, res) {
    const User = await users.findOne({ username: req.query.username})
    if (User) {
        res.status(200).send(User)
        logger.logInfo(`${req.query.username}'s account details was requested via API`)
    } else { 
        res.status(404).json({error: "Error 404 - User not found"})
    }
})

router.get("/user/all", keyAuth, async function (req, res) {
    const allusers = await users.find()
    res.status(200).send(allusers)
    logger.logInfo("All users were requested via API")
})

router.post("/user/create", keyAuth, async function (req, res) {
    const username = sanitize(req.query.username)
    const email = req.query.email
    const password = req.query.password
    const hashedPassword = await bcrypt.hash(password, 10)
    const newUser = new users({
        username: username,
        email: email,
        password: hashedPassword,
        id: Date.now().toString(),
        files: [],
        isVerified: false,
        verifyCode: null,
        sharedFiles: [],
        usedStorage: 0,
        role: "user"
    })
    newUser.save()
    fs.mkdirSync(__dirname + "/../uploads/" + username)
    res.status(201).json({msg: "Response 201 - Created"})
    logger.logInfo(`New user ${username} was created via API`)
})

router.post("/user/delete", keyAuth, async function (req, res) {
    const findUser = await users.findOne({ username: req.query.username})
    if (findUser) {
        const deleteUser = await users.findOneAndRemove({ username: req.query.username})
        fs.rmdirSync(__dirname + "/.." + config.uploadsfolder + `${user.username}/`)
        res.status(200).json({msg: "Response 200 - OK"})
        logger.logInfo(`User ${req.query.username} was deleted via API`)
    } else {
        res.status(404).json({error: "Error 404 - User not found"})
    }

})


router.post("/user/edit/", keyAuth, async function (req, res) {
    const username = req.query.username
    const newusername = req.query.newusername
    const newemail = req.query.newemail
    const newpassword = req.query.newpassword
    const hashedpassword = await bcrypt.hash(newpassword, 10)
    const findUser = await users.findOne({username: username})
    if (findUser) {
        const updateUser = await users.findOne({username: username}, {
            username: newusername,
            email: newemail,
            password: hashedpassword
        })
        res.status(201).json({msg: "Response 201 - User edited"})
        logger.logInfo(`User ${username} was edited via API (New username: ${newusername}, New email: ${newemail})`)
    } else {
        res.status(404).json({error: "Error 404 - User not found"})
    }

})

// API: FILES

router.get("/files/", keyAuth, async function (req, res) {
    const username = req.query.username
    const findUser = await users.findOne({username: username})
    if (findUser) {
        const files = findUser.files
        res.status(200).send(files)
        logger.logInfo(`${username}'s files was requested via API`)
    } else {
         res.status(404).json({error: "Error 404 - User not found"})
    }
})

router.post("/files/delete/", keyAuth, async function (req, res) {
    const username = req.query.username
    const file = req.query.file
    const findUser = await users.findOne({username: username})
    if (findUser) {
        if (findUser.files.includes(file)) {
            findUser.files.pull(file)
            fs.unlinkSync(__dirname + "/.." + config.uploadsfolder + `${username}/` + file)
            if (findUser.sharedFiles.includes(file)) {
                findUser.sharedFiles.pull(file)
            }
            findUser.save()
            res.status(200).json({msg: "Response 200 - OK"})
            logger.logInfo(`${username}'s file ${file} was deleted via API`)
        } else {
            res.status(404).json({error: "Error 404 - File not found"})
        }
    } else {
        res.status(404).json({error: "Error 404 - User not found"})
    }
})

router.post("/files/rename/", keyAuth, async function (req, res) {
    const username = req.query.username
    const file = req.query.file
    const newname = req.query.newname
    const findUser = await users.findOne({username: username})
    if (findUser) {
        if (findUser.files.includes(file)) {
            findUser.files.pull(file)
            findUser.files.push(newname)
            fs.renameSync(__dirname + "/.." + config.uploadsfolder + `${username}/` + file, __dirname + "/.."  + config.uploadsfolder + `${username}/` + newname)
            if (findUser.sharedFiles.includes(file)) {
                findUser.sharedFiles.pull(file)
                findUser.sharedFiles.push(newname)
            }
            findUser.save()
            res.status(201).json({msg: "Response 201 - File renamed"})
            logger.logInfo(`${username}'s file ${file} was renamed to ${newname} via API`)
        } else {
        res.status(404).json({error: "Error 404 - File not found"})
        }
    } else {
        res.status(404).json({error: "Error 404 - User not found"})
    }
})

router.post("/files/share/", keyAuth, async function (req, res) {
    const username = req.query.username
    const file = req.query.file
    const findUser = await users.findOne({username: username})
    if (findUser) {
        if (findUser.files.includes(file)) {
            if (findUser.sharedFiles.includes(file)) {
                res.status(409).json({error: "Error 409 - File already exist in sharedFiles"})
            } else {
                findUser.sharedFiles.push(file)
                findUser.save()
                res.status(201).json({msg: "Response 200 - File shared"})
                logger.logInfo(`${username}'s file ${file} was set as shared via API`)
            }
        } else {
            res.status(404).json({error: "Error 404 - File not found"})
        }
    } else {
        res.status(404).json({error: "Error 404 - User not found"})
    }
})

router.post("/files/noshare/", keyAuth, async function (req, res) {
    const username = req.query.username
    const file = req.query.file
    const findUser = await users.findOne({username: username})
    if (findUser) {
        if (findUser.files.includes(file)) {
            if (!findUser.sharedFiles.includes(file)) {
                res.status(404).json({error: "Error 404 - File not found in sharedFiles"})
            } else {
                findUser.sharedFiles.pull(file)
                findUser.save()
                res.status(201).json({msg: "Response 201 - File set as not shared"})
                logger.logInfo(`${username}'s file ${file} was set as not shared via API`)
            }
        } else {
            res.status(404).json({error: "Error 404 - File not found"})
        }
    } else {
        res.status(404).json({error: "Error 404 - User not found"})
    }
})

// API: ROLES

router.get("/role/", keyAuth, async function (req, res) {
    const rolename = req.query.name
    const role = await roles.findOne({ name: rolename})
    if (role) {
        res.status(200).send(role)
        logger.logInfo(`${role.name}'s details were requested via API`)
    } else {
        res.status(404).json({error: "Error 404 - Role not found"})
    }
})

router.get("/role/all/", keyAuth, async function (req, res) {
    const roles = await roles.find()
    res.status(200).send(roles)
    logger.logInfo(`All roles were requested via API`)
})

router.post("/role/create", keyAuth, async function (req, res) {
    const rolename = req.query.name
    const maxStorage = req.query.maxStorage
    const role = new roles({
        name: rolename,
        maxStorage: maxStorage
    })
    role.save()
    res.status(201).json({msg: "Response 201 - Role created"})
    logger.logInfo(`Role ${rolename} was created via API`)
})

router.post("/role/delete", keyAuth, async function (req, res) {
    const rolename = req.query.name
    const deleteRole = await roles.findOneAndRemove({ name: rolename })
    res.status(200).json({msg: "Response 200 - Role deleted"})
    logger.logInfo(`Role ${rolename} was deleted via API`)
})

router.post("/role/edit", keyAuth, async function (req, res) {
    const rolename = req.query.name
    const newname = req.query.newname
    const newmaxStorage = req.query.maxStorage
    const updateRole = await roles.findOneAndUpdate({ name: rolename}, { name: newname, maxStorage: newmaxStorage})
    res.status(201).json({msg: "Response 201 - Role edited"})
    logger.logInfo(`Role ${rolename} was edited via API`)
})

module.exports = router