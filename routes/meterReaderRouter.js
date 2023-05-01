const express = require('express');
const meterReaderRouter = express.Router();

const authenticateToken = require('../middlewares/authenticateToken');
const isMeterReader = require('../middlewares/isMeterReader');

const { fetchSchedule, fetchConsumers } = require('../controllers/meterReaderController');

// GET REQUESTS
meterReaderRouter.get('/fetch-schedule', authenticateToken, isMeterReader, fetchSchedule);
meterReaderRouter.get('/fetch-consumers', authenticateToken, isMeterReader, fetchConsumers)

module.exports = meterReaderRouter;