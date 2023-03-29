const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
    userId: {
      type: String,
      required: true
    },
    password: {
      type: String,
      required: true
    },
    userRole: {
      type: String,
      required: true
    }
});

module.exports = mongoose.model('Users', userSchema);