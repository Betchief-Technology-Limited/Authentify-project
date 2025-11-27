import { createAndSendOtpEmail } from "../services/emailOtpService.js";
import Otp from "../models/otp.js";
import { totpVerify } from "authentifyotp";

/**
 * POST /api/otp/email
 * Protected - requires authMiddleware (req.admin)
 * body: { to, otpLength }
 */

export async function sendEmailOtp(req, res) {
    try {
        const { to, otpLength } = req.body
        if (!to) {
            return res.status(400).json({ success: false, message: "`to` (recipient email) is required" });
        }

        const result = await createAndSendOtpEmail({
            admin: req.admin,
            to,
            otpLength
        });

        if (!result.sendResp.success) {
            return res.status(502).json({
                success: false,
                message: "SES failed to send email OTP",
                providerRaw: result.sendResp.raw
            });
        }

        return res.status(200).json({
            success: true,
            message: "OTP generated and email delivered successfully",
            otpId: result.otpDoc._id,
            expiresAt: result.otpDoc.expiresAt
        })
    } catch (err) {
        console.error("sendEmailOtp error:", err);
        return res.status(500).json({ success: false, message: "Failed to send OTP", error: err.message });
    }
}

/**
 * POST /api/otp/verify/email
 * Public endpoint to verify code
 * body: { otpId, code }
 */

export async function verifyEmailOtp(req, res) {
    try {
        const { otpId, code } = req.body;
        if (!otpId || !code) {
            return res.status(400).json({ success: false, message: "otpId and code are required" })
        }

        const otpDoc = await Otp.findById(otpId);
        if (!otpDoc) return res.status(404).json({ success: false, message: "OTP not found" });

        if (otpDoc.verified || otpDoc.status === "delivered") {
            return res.status(400).json({ success: false, message: "OTP already used" })
        }

        if (otpDoc.expiresAt < new Date()) {
            otpDoc.status = "failed";
            await otpDoc.save();
            return res.status(400).json({ success: false, message: "OTP expired" })
        }

        const ok = totpVerify(code, otpDoc.secret, { window: 1 });
        if (!ok) return res.status(400).json({ success: false, message: "Invalid OTP code" });

        otpDoc.status = "delivered";
        otpDoc.verified = true;
        await otpDoc.save();

        return res.status(200).json({
            success: true,
            message: "OTP verified successfully",
            otpId: otpDoc._id,
            verifiedAt: new Date()
        })
    } catch (err) {
        console.error("verifyEmailOtp error:", err);
        return res.status(500).json({ success: false, message: "Failed to verify OTP", error: err.message });
    }
}