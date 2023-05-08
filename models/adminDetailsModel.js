const mongoose = require('mongoose');

const adminDetailsSchema = new mongoose.Schema({
    fullName: {
        type: String,
        required: true
    },
    email: {
        type: String,
        required: true
    },
    phoneNum: {
        type: String,
        required: true
    },
    email: {
        type: String,
        required: true
    },
    loginId: {
        type: mongoose.Schema.Types.ObjectId,
        required: true
    }
})

module.exports = mongoose.model('adminDetails', adminDetailsSchema);