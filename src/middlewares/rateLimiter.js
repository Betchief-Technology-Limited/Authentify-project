import rateLimit from "express-rate-limit";

export const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes,
    max: 8, //limit each IP to 8 request per windownMs
    message: { success: false, message: "Too many requests, please try again later" },
    standardHeaders: true,
    legacyHeaders: false,
    skipFailedRequests: false
});