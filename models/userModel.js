const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
    username: {
      type: String,
      required: true
    },
    password: {
      type: String,
      required: true
    },
    userRole: {
      type: String,
      default: 'admin'
    },
    distributorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Organization'
    }
});

module.exports = mongoose.model('Users', userSchema);