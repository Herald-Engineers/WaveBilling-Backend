require('dotenv').config()

const usrDetailsModel = require('../models/usrDetailsModel');
const companiesModel = require('../models/companiesModel');
const scheduleModel = require('../models/scheduleModel');
const meterReaderModel = require('../models/meterReaderModel');
const billModel = require('../models/billModel');
const userModel = require('../models/userModel');
const notificationModel = require('../models/notificationModel');



// READ =============================================================================================================
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

const fetchPreviousReading = async (req, res) => {
    if(!req.query) {
        return res.status(422).json({ message: 'consumerId is null' });
    }
    const { consumerId } = req.query;

    const latestBill = await billModel.findOne({
        consumerId
    }, {}, { sort: { billDate: -1 }, limit: 1 }, function(err, latestBill) {
        if (err) {
            console.log(err);
        } else {
          return latestBill;
        }
    });

    const previousReading = latestBill?latestBill.currentReading:0;
    res.json({ previousReading });
}



// CREATE =============================================================================================================
const addBill = async (req, res) => {
    if(!req.body) {
        return res.status(422).json({ message: 'req.body is null' });
    }

    const { consumerId, currentReading, unitPrice } = req.body;

    if(!consumerId || !currentReading || !unitPrice) {
        return res.status(422).json({ message: 'Please fill all the fields' });
    }

    const alreadyExists = await billModel.findOne({
        consumerId,
        currentReading
    })

    if(alreadyExists) { 
        return res.status(409).json({ message: 'Bill has been already added for this reading' });
    }

    const latestBill = await billModel.findOne({
        consumerId
    }, {}, { sort: { billDate: -1 }, limit: 1 }, function(err, latestBill) {
        if (err) {
            console.log(err);
        } else {
          return latestBill;
        }
    });

    const previousReading = latestBill?latestBill.currentReading:0;

    const billDate = new Date().toISOString().slice(0, 10);

    const billAmount = (currentReading - previousReading) * unitPrice;

    await billModel.create({
        billDate,
        consumerId,
        previousReading,
        currentReading,
        unitPrice,
        billAmount
    });

    // find the userId of the consumer

    // Find the user doc
    const findUserDoc = async () => {
        let userDoc;

        userDoc = await usrDetailsModel.findById(consumerId);
        if(userDoc) return userDoc;
        userDoc = await companiesModel.findById(consumerId);
        if(userDoc) return userDoc;
        return false;
    };
    const userDoc = await findUserDoc();
    if(!userDoc) return res.status(422).json({ message: 'userDoc not found' });

    // Find the login doc
    const loginDoc = await userModel.findById(userDoc.loginId);
    if(!loginDoc) return res.status(422).json({ message: 'Login details not found for the consumer' });

    const userId = loginDoc.userId;

    // Add notification to that userId
    await notificationModel.create({
        userId,
        date: new Date(),
        body: 'New bill issued for ' + billDate
    })

    res.json({ message: 'bill added successfully' });
}


module.exports = { fetchSchedule, fetchConsumers, addBill, fetchPreviousReading };