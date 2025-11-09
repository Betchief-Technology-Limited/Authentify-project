import express from 'express';
import {
    // 🔹 Flutterwave
    paymentVerification,
    paymentInit,
    flutterwaveWebhook,

    // 🔹 Paystack (Standard flow)
    initializePaystackPayment,
    confirmPaystackPayment,


    // 🔹 Paystack (Custom Tokenized flow)
    paystackTokenize,
    paystackChargeToken,
    paystackSubmitOtp
} from '../controllers/paymentController.js';
import { authMiddleware } from '../middlewares/jwtAuth.js';

const paymentRouter = express.Router();

/* =====================================================
   🟢 FLUTTERWAVE ROUTES
   ===================================================== */

// 1️⃣ Initialize Flutterwave payment (redirect)
paymentRouter.post('/init', authMiddleware, paymentInit);

// 2️⃣ Verify Flutterwave payment (after redirect)
paymentRouter.get('/verify/:tx_ref', authMiddleware, paymentVerification);

// 3️⃣ Flutterwave webhook (auto confirmation)
paymentRouter.post('/webhook', express.json(), flutterwaveWebhook);



/* =====================================================
   💳 PAYSTACK ROUTES (STANDARD IFRAME/REDIRECT)
   ===================================================== */

// 1️⃣ Initialize Paystack standard payment
paymentRouter.post('/paystack/init', authMiddleware, initializePaystackPayment);

// 2️⃣ Confirm Paystack standard payment (frontend callback)
paymentRouter.post('/paystack/confirm', authMiddleware, confirmPaystackPayment);


/* =====================================================
   🔐 PAYSTACK TOKENIZATION ROUTES (CUSTOM CARD FORM)
   ===================================================== */

// 1️⃣ Tokenize card securely (PCI-safe)
paymentRouter.post('/paystack/tokenize', authMiddleware, paystackTokenize);

// 2️⃣Send otp3️
paymentRouter.post('/paystack/submit_otp', authMiddleware, paystackSubmitOtp);

//3️⃣ Charge using token (no redirect, instant wallet credit)
paymentRouter.post('/paystack/charge-token', authMiddleware, paystackChargeToken);



export default paymentRouter