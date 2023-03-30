const mongoose = require('mongoose');

const meterReaderSchema = new mongoose.Schema({
    fullName: {
        type: String,
        required: true
    },
    email: {
        type: String,
        required: true
    },
    contactNum: {
        type: String,
        required: true
    },
    loginId: {
        type: mongoose.Schema.Types.ObjectId,
        required: true
    }
})

module.exports = mongoose.model('meterReaders', meterReaderSchema);