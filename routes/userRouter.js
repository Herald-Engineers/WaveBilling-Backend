const express = require('express');
const { login, registerCompany, registerUser, sendOtp, contactWavebilling, submitIssue, fetchMyBills, payBill, fetchMyReceipts, fetchReport, fetchBillDetails, fetchTotalPayment, myAdvancePayment,fetchProfileInfo, editProfileInfo, verifyOtp, fetchReceiptDetails, getNotificationCount, getNotifications } = require('../controllers/userController');
const userRouter = express.Router();
const authenticateToken = require('../middlewares/authenticateToken');

// POST REQUESTS
userRouter.post('/login', login);
userRouter.post('/register-company', registerCompany);
userRouter.post('/register-user', registerUser);
userRouter.post('/send-otp', sendOtp);
userRouter.post('/verify-otp', verifyOtp);
userRouter.post('/contact-wavebilling', contactWavebilling);
userRouter.post('/submit-issue', authenticateToken,  submitIssue);
userRouter.post('/pay-bill', authenticateToken, payBill);

// PATCH REQUESTS
userRouter.patch('/edit-profile-info', authenticateToken, editProfileInfo);

// GET REQUESTS
userRouter.get('/my-bills', authenticateToken, fetchMyBills);
userRouter.get('/fetch-bill-details', authenticateToken, fetchBillDetails);
userRouter.get('/my-receipts', authenticateToken, fetchMyReceipts);
userRouter.get('/fetch-receipt-details', authenticateToken, fetchReceiptDetails)
userRouter.get('/get-report', authenticateToken, fetchReport);
userRouter.get('/get-total-payment', authenticateToken, fetchTotalPayment);
userRouter.get('/my-advance-payment', authenticateToken, myAdvancePayment);
userRouter.get('/fetch-profile-info', authenticateToken, fetchProfileInfo);
userRouter.get('/get-notification-count', authenticateToken, getNotificationCount);
userRouter.get('/get-notifications', authenticateToken, getNotifications);

module.exports = userRouter;