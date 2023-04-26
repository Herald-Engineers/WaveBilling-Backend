const express = require('express');
const adminRouter = express.Router();

const { fetchRequests, addReader, fetchReaders, deleteReader, editReader, fetchUsername, addSchedule } = require('../controllers/adminControllers');

const authenticateToken = require('../middlewares/authenticateToken');
const isAdmin = require('../middlewares/isAdmin');

adminRouter.post('/add-reader', authenticateToken, isAdmin, addReader);
adminRouter.get('/fetch-readers', authenticateToken, isAdmin, fetchReaders);
adminRouter.get('/fetch-userid', authenticateToken, isAdmin, fetchUsername)
adminRouter.patch('/edit-reader', authenticateToken, isAdmin, editReader);
adminRouter.delete('/delete-reader', authenticateToken, isAdmin, deleteReader);
// adminRouter.post('/request-otp');
adminRouter.post('/add-schedule', authenticateToken, isAdmin, addSchedule);

module.exports = adminRouter;