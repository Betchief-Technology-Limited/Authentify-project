import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import cookieParser from 'cookie-parser';
import { allowedOrigins } from './config/corsConfig.js';
import errorHandler from './config/errorHandler.js';

import adminRouter from './routes/adminRoutes.js';
import otpSmsRouter from './routes/otpRoutes.js';
import walletRouter from './routes/walletRoutes.js';
import paymentRouter from './routes/paymentRoutes.js';
import whatsappRouter from './routes/whatsappOtpRoutes.js';
import telegramRouter from './routes/telegramOtpRoutes.js';
import selectableRouter from './routes/selectableOtpRoutes.js';
import kycRouter from './routes/kycRoutes.js';
import emailRouter from './routes/emailRoutes.js';
import subscriptionRouter from './routes/subscriptionRoutes.js';
import organizationRouter from './routes/organizationRoutes.js';
import serviceAdminRouter from './routes/serviceAdminRoutes.js';
import { paystackWebhook } from './controllers/paymentController.js';
import adminProfileRouter from './routes/adminProfileUpdateRoute.js';
import changePasswordRouter from './routes/changePasswordRoutes.js';
import forgotPasswordRouter from './routes/forgotPasswordRoute.js';
import analyticsRouter from './routes/analyticsRoutes.js';
import submitHelpRouter from './routes/customerHelpRoute.js';
import kycQuickVerifcationRouter from './routes/kycQuickVerificationRoute.js';
import emailOtpRouter from './routes/emailOtpRoute.js';

const app = express();

app.set("trust proxy", 1); // REQUIRED for express-rate-limit in local + deploymen

app.use(morgan('dev'));


// ✅ Configure CORS
const corsOptions = {
    origin: function (origin, callback) {
        if (!origin) return callback(null, true);
        if (allowedOrigins.includes(origin)) {
            return callback(null, true);
        } else {
            console.warn(`🚫 CORS blocked: ${origin}`);
            return callback(null, false);
        }
    },
    credentials: true,
    optionsSuccessStatus: 200,
};

app.use(cors(corsOptions));
// ✅ Use regex for preflight requests (Express 5 fix)
app.options(/.*/, cors(corsOptions));

// Parse cookies
app.use(cookieParser());


// ✅ PAYSTACK WEBHOOK — must come before express.json()
app.post(
    '/api/payment/paystack/webhook',
    express.raw({ type: 'application/json' }),  // <-- 👈 raw parser here
    paystackWebhook
);

// ✅ Regular parsers for all other routes
app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true }));


// Mount routes
app.use('/api', adminRouter);
app.use('/api/otp', otpSmsRouter);
app.use('/api/otp', whatsappRouter);
app.use('/api/otp', telegramRouter);
app.use('/api/otp', emailOtpRouter);
app.use('/api/wallet', walletRouter);
app.use('/api/payment', paymentRouter);
app.use('/api/otp/selectable', selectableRouter);
app.use('/api/kyc', kycRouter);
app.use('/api/email', emailRouter);
app.use('/api/organization', organizationRouter);
app.use('/api/subscription', subscriptionRouter);
app.use('/api/serviceadmin', serviceAdminRouter);
app.use('/api/profile', adminProfileRouter);
app.use('/api/change', changePasswordRouter);
app.use('/api/admin', forgotPasswordRouter);
app.use('/api/analytics', analyticsRouter);
app.use('/api/customer', submitHelpRouter);
app.use('/api/single-request', kycQuickVerifcationRouter);

// 404 handler
app.use((req, res) =>
    res.status(404).json({ success: false, message: "Route not found" })
);

// Centralized error handler
app.use(errorHandler);

export default app;
