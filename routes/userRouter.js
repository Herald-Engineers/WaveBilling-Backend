const express = require('express');
const { login, register, requestAccount } = require('../controllers/userController');
const userRouter = express.Router();

userRouter.post('/login', login);
userRouter.post('/register', register);
userRouter.post('/request-account', requestAccount);

module.exports = userRouter;