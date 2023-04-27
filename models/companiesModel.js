const mongoose = require('mongoose');
const companySchema = new mongoose.Schema({
    companyName: {
      type: String,
      required: true
    },
    address: {
      type: String,
      required: true
    },
    email1: {
      type: String,
      required: true
    },
    fullName: {
      type: String,
      required: true
    },
    email2: {
      type: String,
      required: true
    },
    jobTitle: {
      type: String,
      required: true
    },
    contactNum: {
      type: String,
      required: true
    },
    paymentMethod: {
      type: String,
      required: true
    },
    bankName: {
      type: String,
      required: true
    },
    accountNum: {
      type: String,
      required: true
    },
    billingCycle: {
      type: String,
      required: true
    },
    paymentDueDate: {
      type: String,
      required: true
    },
    estimatedWaterUsage: {
      type: String,
      required: true
    },
    noOfMeters: {
      type: String,
      required: true
    },
    approvedStatus: {
      type: Boolean,
      default: false
    },
    loginId: mongoose.Schema.Types.ObjectId
});

module.exports = mongoose.model('Company', companySchema);