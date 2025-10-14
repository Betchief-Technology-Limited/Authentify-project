import express from 'express';
import {
    paymentVerification,
    paymentInit,
    flutterwaveWebhook
} from '../controllers/paymentController.js';
import { authMiddleware } from '../middleware/jwtAuth.js';

const paymentRouter = express.Router();

// verify payment
paymentRouter.post('/init', authMiddleware, paymentInit)
paymentRouter.post('/verify/:tx_ref', authMiddleware, paymentVerification);

// Flutterwave webhook
paymentRouter.post('/webhook', flutterwaveWebhook)

export default paymentRouter