const mongoose = require('mongoose');

const users = new mongoose.Schema({
    username: { type: String, require: true, unique: true},
    email: { type: String, require: true, unique: true},
    password: { type: String, require: true},
    id: { type: String, require: true},
    files: { type: Array},
    isVerified: { type: Boolean},
    verifyCode: { type: String},
    sharedFiles: {type: Array},
    usedStorage: { type: Number},
    role: { type: String},
    ip: { type: String}
})

const model = mongoose.model('users', users)

module.exports = model;