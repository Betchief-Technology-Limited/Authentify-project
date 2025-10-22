import express from 'express';  
import cors from 'cors';
import morgan from 'morgan';
import cookieParser from 'cookie-parser';

import { adminRouter } from './routes/adminRoutes.js';
import { otpSmsRouter } from './routes/otpRoutes.js';
import walletRouter from './routes/walletRoutes.js';
import paymentRouter from './routes/paymentRoutes.js';
import whatsappRouter from './routes/whatsappOtpRoutes.js';
import telegramRouter from './routes/telegramOtpRoutes.js';
import selectableRouter from './routes/selectableOtpRoutes.js';
import kycRouter from './routes/kycRoutes.js';
import emailRouter from './routes/emailRoutes.js';
import organizationRouter from './routes/organizationRoutes.js';
import subscriptionRouter from './routes/subscriptionRoutes.js';
// import { testRouter } from './routes/testRoutes.js';

const app = express();

app.use(morgan('dev'));

// CORS with credentials support
app.use(cors({
    origin: 'http://localhost:3000', //this will be replaced with the real frontend URL
    credentials: true
}));

// Parse cookies
app.use(cookieParser());

// Parse JSON
app.use(express.json());


// Mount routes
app.use('/api', adminRouter);
app.use('/api/otp', otpSmsRouter);
app.use('/api/otp', whatsappRouter);
app.use('/api/otp', telegramRouter);
app.use('/api/wallet', walletRouter);
app.use('/api/payment', paymentRouter);
app.use('/api/otp/selectable', selectableRouter);
app.use('/api/kyc', kycRouter);
app.use('/api/email', emailRouter);
app.use('/api/organization', organizationRouter);
app.use('/api/subscription', subscriptionRouter);
// app.use('/api/otp', testRouter)

export default app;
