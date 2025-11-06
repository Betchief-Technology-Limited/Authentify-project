import express from 'express';
import {
    paymentVerification,
    paymentInit,
    flutterwaveWebhook,
    initializePaystackPayment,
    confirmPaystackPayment,
    handlePaystackWebhookController
} from '../controllers/paymentController.js';
import { authMiddleware } from '../middlewares/jwtAuth.js';

const paymentRouter = express.Router();

// verify payment
paymentRouter.post('/init', authMiddleware, paymentInit)
paymentRouter.post('/verify/:tx_ref', authMiddleware, paymentVerification);

// Flutterwave webhook
paymentRouter.post('/webhook', express.json(), flutterwaveWebhook);

paymentRouter.post('/paystack/init', authMiddleware, initializePaystackPayment);
paymentRouter.post('/paystack/confirm', confirmPaystackPayment);

// ✅ Paystack webhook (RAW body required)
paymentRouter.post(
    "/paystack/webhook",
    express.raw({ type: "application/json" }), // <-- critical difference
    handlePaystackWebhookController
);


export default paymentRouter