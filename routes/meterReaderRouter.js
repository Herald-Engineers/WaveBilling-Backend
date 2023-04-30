const express = require('express');
const meterReaderRouter = express.Router();

const authenticateToken = require('../middlewares/authenticateToken');
const isMeterReader = require('../middlewares/isMeterReader');

const { fetchSchedule } = require('../controllers/meterReaderController');

// GET REQUESTS
meterReaderRouter.get('/fetch-schedule', authenticateToken, isMeterReader, fetchSchedule);

module.exports = meterReaderRouter;