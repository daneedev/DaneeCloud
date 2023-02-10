const mongoose = require('mongoose');

const role = new mongoose.Schema({
    name: { type: String},
    maxStorage: { type: Number}
})

const model = mongoose.model('roles', role)

module.exports = model;