// import { createAndSendOtpSms } from "../services/OtpService.js";

// export const testController = async (req, res) => {
//     try {
//         const { to, otpLength } = req.body;
//         const admin = { _id: null }; // mock admin

//         const result = await createAndSendOtpSms({ admin, to, otpLength });

//         const response = {
//             success: true,
//             message: process.env.TEST_MODE === "true"
//                 ? "OTP generated successfully (TEST MODE)"
//                 : "OTP sent via Mobishastra",
//             expiresAt: result.otpDoc.expiresAt,
//             provider: result.otpDoc.provider,
//         };

//         // 👇 only include OTP if running in test mode
//         if (process.env.TEST_MODE === "true") {
//             response.otp = result.code;
//         }

//         return res.status(200).json(response);
//     } catch (err) {
//         console.error("❌ Test OTP error:", err.message);
//         return res.status(500).json({ success: false, error: err.message });
//     }
// }