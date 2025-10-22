import express from 'express';
import { apiKeyAuth } from '../middlewares/apiKeyAuth.js';
import { generateSelectableOtp, verifySelectableOtp } from '../controllers/selectableOtpController.js';

const selectableRouter = express.Router();

// Generate selectable OTP (SMS, WhatsApp, Telegram)
selectableRouter.post('/generate', apiKeyAuth, generateSelectableOtp);

// Verify selectable OTP
selectableRouter.post('/verify', apiKeyAuth, verifySelectableOtp);

export default selectableRouter