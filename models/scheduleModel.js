const mongoose = require('mongoose');

const scheduleSchema = new mongoose.Schema({
    address1: {
        type:String,
        required: true
    },
    address2: String,
    address3: String,
    address4: String,
    address5: String,
    date: {
        type: String,
        required: true
    },
    shift: {
        type: String,
        required: true
    },
    assignedTo: {
        type: mongoose.Schema.Types.ObjectId,
        required: true
    }
})

module.exports = mongoose.model('schedules', scheduleSchema);