const mongoose = require('mongoose');

const vidSubtitle = new mongoose.Schema({
    filename: { type: String},
    subtitleurl: { type: String},
    subtitlename: { type: String}
})

const model = mongoose.model('vidSubtitles', vidSubtitle)

module.exports = model;