const mongoose = require('mongoose');

const otpSchema = new mongoose.Schema({
    email: {
        type: String,
        required: true
    },
    otpPin: {
        type: String,
        required: true
    },
    otpExpiration: {
        type: Date,
        required: true
    }
})

module.exports = mongoose.model('otp', otpSchema);