const mongoose = require('mongoose');

const requestAccountSchema = new mongoose.Schema({
    firstName: {
      type: String,
      required: true
    },
    middleName: String,
    lastName: {
      type: String,
      required: true
    },

    houseNo: {
      type: String,
      required: true
    },
    province: {
      type: String,
      required: true
    },
    municipality: {
      type: String,
      required: true
    },
    wardNo: {
      type: String,
      required: true
    },
    tole: {
      type: String,
      required: true
    },

    tel1: String,
    tel2: {
        type: String,
        required: true
    },

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
    issueDate: {
      type: String,
      required: true
    },

    citizenshipDoc: {
        type: String,
        required: true
    },
    landOwnershipDoc: {
        type: String,
        required: true
    },
    loginId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true
    }
});

module.exports = mongoose.model('usrDetails', requestAccountSchema);