const express = require('express');
const adminRouter = express.Router();

const { fetchRequests, addReader, fetchReaders } = require('../controllers/adminControllers');

const authenticateToken = require('../middlewares/authenticateToken');
const isAdmin = require('../middlewares/isAdmin');

adminRouter.get('/fetch-requests', fetchRequests);
adminRouter.post('/add-reader', authenticateToken, isAdmin, addReader);
adminRouter.get('/fetch-readers', authenticateToken, isAdmin, fetchReaders);
// adminRouter.post('/request-otp');

module.exports = adminRouter;