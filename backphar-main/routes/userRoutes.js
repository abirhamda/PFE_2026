import express from 'express';
import userController from '../controllers/userController.js';
import passwordResetController from '../controllers/passwordResetController.js';

const router = express.Router();

router.post('/login', userController.loginUser);

router.post('/register', userController.createUser);

router.post('/forgot-password', passwordResetController.requestPasswordReset);

router.post('/reset-password', passwordResetController.resetPassword);

export default router;
