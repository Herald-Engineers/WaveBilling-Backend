const express = require('express');
const { login, registerCompany, registerUser, resetPassword, contactWavebilling, submitIssue, fetchMyBills, payBill, fetchMyReceipts, fetchReport, fetchBillDetails } = require('../controllers/userController');
const userRouter = express.Router();
const authenticateToken = require('../middlewares/authenticateToken');

// POST REQUESTS
userRouter.post('/login', login);
userRouter.post('/register-company', registerCompany);
userRouter.post('/register-user', registerUser);
userRouter.post('/reset-password', resetPassword);
userRouter.post('/contact-wavebilling', contactWavebilling);
userRouter.post('/submit-issue', authenticateToken,  submitIssue);
userRouter.post('/pay-bill', authenticateToken, payBill);

// GET REQUESTS
userRouter.get('/my-bills', authenticateToken, fetchMyBills);
userRouter.get('/my-receipts', authenticateToken, fetchMyReceipts);
userRouter.get('/get-report', authenticateToken, fetchReport);
userRouter.get('/fetch-bill-details', authenticateToken, fetchBillDetails);

module.exports = userRouter;