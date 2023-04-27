const mongoose = require('mongoose');

const receiptSchema = new mongoose.Schema({
    fullName: {
        type: String,
        required: true
    },
    consumerType: {
        type: String,
        required: true
    },
    consumerId: {
        type: mongoose.Schema.Types.ObjectId,
        required: true
    },
    month: {
        type: String,
        required: true
    },
    units: {
        type: Number,
        required: true
    },
    billAmount: {
        type: Number,
        required: true
    },
    paid: {
        type: Boolean,
        default: false
    }
})

module.exports = mongoose.model('receipts', receiptSchema);