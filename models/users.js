const mongoose = require('mongoose');

const users = new mongoose.Schema({
    username: { type: String, require: true, unique: true},
    email: { type: String, require: true, unique: true},
    password: { type: String, require: true},
})

const model = mongoose.model('users', users)

module.exports = model;