const mongoose = require('mongoose');
const meterSchema = new mongoose.Schema({
    meterNo: {
        type: String,
        required: true
    },
    username: {
        type: String,
        required: true
    }
});

module.exports = mongoose.model('meters', meterSchema);