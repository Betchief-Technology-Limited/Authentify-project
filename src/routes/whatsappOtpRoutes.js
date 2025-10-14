import express from 'express';
import { apiKeyAuth } from '../middleware/apiKeyAuth.js';
import { sendWhatsappOtp, verifyWhatsappOtp } from '../controllers/whatsappOtpController.js';

const whatsappRouter = express.Router();

// ✅ Client hits this to equest OTP for their end-user
whatsappRouter.post('/whatsapp', apiKeyAuth, sendWhatsappOtp);

// Client hits this to verify OTP entered by their end-user
whatsappRouter.post('/whatsapp/verify', apiKeyAuth, verifyWhatsappOtp);

export default whatsappRouter;