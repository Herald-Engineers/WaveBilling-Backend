const express = require('express');
const { login, registerCompany, registerUser, resetPassword, contactWavebilling, submitIssue, fetchMyBills, payBill } = require('../controllers/userController');
const userRouter = express.Router();
const authenticateToken = require('../middlewares/authenticateToken');

userRouter.post('/login', login);
userRouter.post('/register-company', registerCompany);
userRouter.post('/register-user', registerUser);
userRouter.post('/reset-password', resetPassword);
userRouter.post('/contact-wavebilling', contactWavebilling);
userRouter.post('/submit-issue', authenticateToken,  submitIssue);
userRouter.post('/pay-bill', authenticateToken, payBill);

userRouter.get('/my-bills', authenticateToken, fetchMyBills);

module.exports = userRouter;