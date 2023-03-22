const mongoose = require('mongoose');
const organizationSchema = new mongoose.Schema({
    companyName: {
      type: String,
      required: true
    },
    addressDistrict: {
      type: String,
      required: true
    },
    addressProvince: {
      type: String,
      required: true
    },
    addressWardNum: {
      type: String,
      required: true
    },
    addressMunicipality: {
      type: String,
      required: true
    },
    addressTole: {
      type: String,
      required: true
    },
    contactNum: {
      type: String,
      required: true
    }
});

module.exports = mongoose.model('Organization', organizationSchema);