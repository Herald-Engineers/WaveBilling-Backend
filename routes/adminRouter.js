const express = require('express');
const adminRouter = express.Router();

const { fetchRequests, addReader, fetchReaders, deleteReader, editReader } = require('../controllers/adminControllers');

const authenticateToken = require('../middlewares/authenticateToken');
const isAdmin = require('../middlewares/isAdmin');

adminRouter.get('/fetch-requests', fetchRequests);
adminRouter.post('/add-reader', authenticateToken, isAdmin, addReader);
adminRouter.get('/fetch-readers', authenticateToken, isAdmin, fetchReaders);
adminRouter.patch('/edit-reader', authenticateToken, isAdmin, editReader);
adminRouter.delete('/delete-reader', authenticateToken, isAdmin, deleteReader);
// adminRouter.post('/request-otp');

module.exports = adminRouter;