const express = require('express');
const { login, registerCompany, registerUser, resetPassword, contactWavebilling } = require('../controllers/userController');
const userRouter = express.Router();

userRouter.post('/login', login);
userRouter.post('/register-company', registerCompany);
userRouter.post('/register-user', registerUser);
userRouter.post('/reset-password', resetPassword);
userRouter.post('/contact-wavebilling', contactWavebilling);

module.exports = userRouter;