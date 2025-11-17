import express from 'express';
import { authLimiter } from '../middlewares/rateLimiter.js';
import { 
    forgotPassword,
    verifyResetToken,
    resetPassword
} from '../controllers/forgotPasswordController.js';

const forgotPasswordRouter = express.Router();

// Forgot password
forgotPasswordRouter.post('/forgot-password', authLimiter, forgotPassword);

// Verify token 
forgotPasswordRouter.get('/verify-token', verifyResetToken);

// Reset password
forgotPasswordRouter.post('/reset-password', resetPassword);

export default forgotPasswordRouter;