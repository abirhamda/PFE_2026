import express from 'express';
import userController from '../controllers/userController.js';

const router = express.Router();

router.post('/login', userController.loginUser);

router.post('/register', userController.createUser);

export default router;

