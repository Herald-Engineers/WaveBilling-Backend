const mongoose = require('mongoose');

const advancePaymentSchema = new mongoose.Schema({
    paymentDate: {
        type: Date,
        required: true
    },
    consumerId: {
        type: String,
        required: true
    },
    advanceAmount: {
        type: Number,
        required: true
    }
})

module.exports = mongoose.model('advancePayments', advancePaymentSchema);