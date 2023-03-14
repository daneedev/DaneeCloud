const mongoose = require('mongoose');

const apiKey = new mongoose.Schema({
    name: { type: String},
    apiKey: { type: String}
})

const model = mongoose.model('apiKeys', apiKey)

module.exports = model;