require('dotenv').config()

const usrDetailsModel = require('../models/usrDetailsModel');
const companiesModel = require('../models/companiesModel');
const scheduleModel = require('../models/scheduleModel');
const meterReaderModel = require('../models/meterReaderModel');

const fetchSchedule = async(req, res) => {
    try {
        const user_id = await meterReaderModel.findOne({
            loginId: req.user.id
        });

        const result = await scheduleModel.find({
            readerId: user_id._id
        });

        res.json(result)

    } catch (error) {
        res.status(500).json({ message: 'Server error: ' + error });
    }
}

const fetchConsumers = async(req, res) => {
    const individuals = await usrDetailsModel.find({
        approvedStatus: true
    });
    const companies = await companiesModel.find({
        approvedStatus: true
    });

    // console.log(individuals);
    const individualsDetails = await Promise.all(individuals.map(async (individual) => {
        const {
            _id,
            firstName,
            middleName,
            lastName,
            meterNo,
        } = individual;

        return ({
            _id,
            name: middleName ? `${firstName} ${middleName} ${lastName}` : `${firstName} ${lastName}`,
            userId,
            meterNo
        })
    }))

    const companiesDetails = await Promise.all(companies.map(async (company) => {
        const { _id, companyName, meterNo } = company;

        return ({
            _id,
            name: companyName,
            meterNo
        })
    }));

    const result = individualsDetails.concat(companiesDetails);
    res.json(result);
}

module.exports = { fetchSchedule, fetchConsumers };