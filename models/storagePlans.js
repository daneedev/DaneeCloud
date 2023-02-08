const mongoose = require('mongoose');

const storagePlan = new mongoose.Schema({
    maxStorage: { type: Number},
    isEnabled: { type: Boolean }
})

const model = mongoose.model('storagePlans', storagePlan)

module.exports = model;