const express = require('express');
const adminRouter = express.Router();

const { addReader, fetchReaders, deleteReader, editReader, fetchUsername, addSchedule, fetchSchedules, fetchConsumers, approveUser, deleteUser, rejectRequest, fetchIssues, editUser, fetchConsumerDetails } = require('../controllers/adminControllers');

const authenticateToken = require('../middlewares/authenticateToken');
const isAdmin = require('../middlewares/isAdmin');

// POST REQUESTS
adminRouter.post('/add-reader', authenticateToken, isAdmin, addReader);
adminRouter.post('/add-schedule', authenticateToken, isAdmin, addSchedule);
adminRouter.post('/approve-user', authenticateToken, isAdmin, approveUser);
// adminRouter.post('/request-otp');

// GET REQUESTS
adminRouter.get('/fetch-readers', authenticateToken, isAdmin, fetchReaders);
adminRouter.get('/fetch-userid', authenticateToken, isAdmin, fetchUsername);
adminRouter.get('/fetch-schedules', authenticateToken, isAdmin, fetchSchedules);
adminRouter.get('/fetch-consumers', authenticateToken, isAdmin, fetchConsumers);
adminRouter.get('fetch-consumer-details', authenticateToken, isAdmin, fetchConsumerDetails);
adminRouter.get('/fetch-issues', authenticateToken, isAdmin, fetchIssues);

// PATCH REQUESTS
adminRouter.patch('/edit-reader', authenticateToken, isAdmin, editReader);
adminRouter.patch('/edit-user', authenticateToken, isAdmin, editUser);

// DELETE REQUESTS
adminRouter.delete('/delete-reader', authenticateToken, isAdmin, deleteReader);
adminRouter.delete('/delete-user', authenticateToken, isAdmin, deleteUser);
adminRouter.delete('/reject-request', authenticateToken, isAdmin, rejectRequest);

module.exports = adminRouter;