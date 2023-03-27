const express = require('express');
const { login, register, requestAccount, resetPassword } = require('../controllers/userController');
const userRouter = express.Router();

userRouter.post('/login', login);
userRouter.post('/register', register);
userRouter.post('/request-account', requestAccount);
userRouter.post('/reset-password', resetPassword);

module.exports = userRouter;