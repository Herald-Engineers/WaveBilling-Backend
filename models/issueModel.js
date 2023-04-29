const mongoose = require('mongoose');
const issueSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true
    },
    userName: {
        type: String,
        required: true
    },
    phoneNum: {
        type: String,
        required: true
    },
    subject: {
        type: String,
        required: true
    },
    issue: {
        type: String,
        required: true
    }
});

module.exports = mongoose.model('issues', issueSchema);