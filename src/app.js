import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import cookieParser from 'cookie-parser';
import { allowedOrigins } from './config/corsConfig.js';
import errorHandler from './config/errorHandler.js';

import { adminRouter } from './routes/adminRoutes.js';
import { otpSmsRouter } from './routes/otpRoutes.js';
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


// import { testRouter } from './routes/testRoutes.js';

const app = express();

app.use(morgan('dev'));


// ✅ Configure CORS
const corsOptions = {
  origin: function (origin, callback) {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      console.warn(`🚫 Blocked by CORS: ${origin}`);
      // Return an actual error, not (null, false)
      callback(new Error("Not allowed by CORS"));
    }
  },
  credentials: true,
  optionsSuccessStatus: 200,
};

app.use(cors(corsOptions));
// ✅ Use regex for preflight requests (Express 5 fix)
app.options(/.*/, cors(corsOptions));

// app.use(cors({
//     origin: 'http://localhost:5173', //this will be replaced with the real frontend URL
//     credentials: true
// }));

// Parse cookies
app.use(cookieParser());

// Parse JSON
app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true }));


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
app.use('/api/serviceadmin', serviceAdminRouter);
// app.use('/api/otp', testRouter)

// 404 handler
app.use((req, res) =>
    res.status(404).json({ success: false, message: "Route not found" })
);

// Centralized error handler
app.use(errorHandler);

export default app;
