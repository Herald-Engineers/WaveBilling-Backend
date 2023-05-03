const mongoose = require('mongoose');

const receiptSchema = new mongoose.Schema({
    billId: {
        type: mongoose.Schema.Types.ObjectId,
        required: true
    },
    paymentDate: {
        type: Date,
        required: true
    },
    consumerName: {
        type: String,
        required: true
    },
    consumerId: {
        type: String,
        required: true
    },
    consumerAddress: {
        type: String,
        required: true
    },
    meterNo: {
        type: String,
        required: true
    },
    billAmount: {
        type: Number,
        required: true
    },
    fine: Number,
    rebate: Number,
    totalAmount: {
        type: Number,
        required: true
    },
    previousAdvanceAmount: {
        type: Number,
        required: true
    },
    finalAmount: {
        type: Number,
        required: true
    },
    paymentMode: {
        type: String,
        required: true
    }
});

module.exports = mongoose.model('receipts', receiptSchema);