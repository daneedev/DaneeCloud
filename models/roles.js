const mongoose = require('mongoose');

const role = new mongoose.Schema({
    name: { type: String},
    maxStorage: { type: Number},
    badge: { type: String }
})

const model = mongoose.model('roles', role)

module.exports = model;