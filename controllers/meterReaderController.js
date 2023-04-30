require('dotenv').config()
// const { ObjectId } = require('mongodb');
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

module.exports = { fetchSchedule };