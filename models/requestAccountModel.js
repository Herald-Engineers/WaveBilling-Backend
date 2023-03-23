const mongoose = require('mongoose');

const requestAccountSchema = new mongoose.Schema({
    firstName: {
      type: String,
      required: true
    },
    lastName: {
      type: String,
      required: true
    },

    houseNo: {
      type: String,
      required: true
    },
    tole: {
      type: String,
      required: true
    },
    wardNo: {
      type: String,
      required: true
    },
    municipality: {
      type: String,
      required: true
    },

    tel1: {
        type: String,
        required: true
    },
    tel2: String,
    email: {
        type: String,
        required: true
    },
    nationality: {
        type: String,
        required: true
    },
    citizenshipNo: {
        type: String,
        required: true
    },
    passportNo: String,
    supName: String,
    supTelephone: String,
    supEmail: String,
    citizenshipDoc: {
        type: String,
        required: true
    },
    landOwnershipDoc: {
        type: String,
        required: true
    }
});

module.exports = mongoose.model('RequestAccount', requestAccountSchema);