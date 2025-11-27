import express from "express";
import { sendEmailOtp, verifyEmailOtp } from "../controllers/emailOtpController.js";
import { authMiddleware } from "../middlewares/jwtAuth.js";

const emailOtpRouter = express.Router();

// POST request for otp
emailOtpRouter.post('/email/send', authMiddleware, sendEmailOtp);

// POST verify otp
emailOtpRouter.post('/email/verify', verifyEmailOtp);

export default emailOtpRouter;