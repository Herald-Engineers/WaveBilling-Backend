const express = require('express');
const adminRouter = express.Router();
const { fetchRequests, addReader } = require('../controllers/adminControllers');

adminRouter.get('/fetch-requests', fetchRequests);
adminRouter.post('/add-reader', addReader);
// adminRouter.post('/request-otp');

module.exports = adminRouter;