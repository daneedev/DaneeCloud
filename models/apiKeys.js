const mongoose = require('mongoose');

const apiKey = new mongoose.Schema({
    apiKey: { type: String}
})

const model = mongoose.model('apiKeys', apiKey)

module.exports = model;