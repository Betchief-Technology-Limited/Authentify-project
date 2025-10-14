import express from 'express';
import { apiKeyAuth } from '../middleware/apiKeyAuth.js';
import { sendSmsOtp, verifySmsOtp } from '../controllers/otpController.js'

export const otpSmsRouter = express.Router()

// Send OTP via SMS
otpSmsRouter.post('/sms', apiKeyAuth, sendSmsOtp);

// Verify OTP
otpSmsRouter.post('/sms/verify', apiKeyAuth, verifySmsOtp);

