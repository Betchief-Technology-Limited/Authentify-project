import express from 'express';
import { sendTelegramOtp, verifyTelegramOtp } from '../controllers/telegramOtpController.js';
import { apiKeyAuth } from '../middleware/apiKeyAuth.js';
import { handleTelegramWebhook } from '../controllers/telegramWebhookController.js'

const telegramRouter = express.Router();

// Protected endpoints for clients
telegramRouter.post('/telegram/send', apiKeyAuth, sendTelegramOtp);
telegramRouter.post('/telegram/verify', apiKeyAuth, verifyTelegramOtp);

// Public webhook ndpoint for Telegram Gateway status updates
telegramRouter.post('/telegram/webhook', express.json({ type: 'application/json' }), handleTelegramWebhook);

export default telegramRouter;