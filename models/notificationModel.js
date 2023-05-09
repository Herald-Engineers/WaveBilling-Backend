const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
    userId: {
        type: String,
        required: true
    },
    date: {
        type: Date,
        required: true
    },
    body: {
        type: String,
        required: true
    },
    seen: {
        type: Boolean,
        default: false
    }
})

module.exports = mongoose.model('notifications', notificationSchema);