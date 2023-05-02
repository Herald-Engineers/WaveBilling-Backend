const mongoose = require('mongoose');

const billSchema = new mongoose.Schema({
    billDate: {
        type: Date,
        required: true
    },
    consumerId: {
        type: mongoose.Schema.Types.ObjectId,
        required: true
    },
    previousReading: {
        type: Number,
        required: true
    },
    currentReading: {
        type: Number,
        required: true
    },
    unitPrice: {
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

module.exports = mongoose.model('bills', billSchema);