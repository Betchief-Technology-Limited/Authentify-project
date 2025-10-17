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
// app.use('/api/otp', testRouter)

export default app;
