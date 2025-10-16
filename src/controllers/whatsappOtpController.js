import Otp from "../models/otp.js";
import { createAndSendOtpWhatsapp } from "../services/whatsappOtpService.js";
import { totpVerify } from "authentifyotp";

export const sendWhatsappOtp = async (req, res) => {
    try {
        const { to, otpLength } = req.body;

        if (!to) {
            return res.status(400).json({ message: '`to` (recipient Whatsapp number) is required' });
        }

        const result = await createAndSendOtpWhatsapp({
            admin: req.admin,
            to,
            otpLength //👈Forward client's requested OTP length
        });

        return res.status(200).json({
            success: true,
            message: 'OTP generated and sent via Whatsapp',
            otpId: result.otpDoc._id,
            providerResp: result.whatsappResp
        });
    } catch (err) {
        return res.status(500).json({
            message: 'Failed to send OTP via Whatsapp',
            error: err.message
        })
    }
}

// Verify OTP code
export const verifyWhatsappOtp = async (req, res) => {
    try {
        const { otpId, code } = req.body;

        if (!otpId || !code) {
            return res.status(400).json({ message: 'otpId and code are required' });
        }

        // Lookup OTP document
        const otpDoc = await Otp.findById(otpId);
        if (!otpDoc) {
            return res.status(404).json({ message: 'OTP record not found' });
        }

        // Already used OTP
        if (otpDoc.verified || otpDoc.status === 'delivered') {
            return res.status(400).json({ message: 'OTP already used' });
        }

        // Check expiry
        if (otpDoc.expiresAt < new Date()) {
            return res.status(400).json({ message: 'OTP expired' });
        }

        // ✅ Verify OTP 
        const isValid = totpVerify(code, otpDoc.secret, { window: 1 });
        if (!isValid.ok) {
            return res.status(400).json({ message: 'Invalid OTP code' });
        }

        otpDoc.status = 'delivered',
            otpDoc.verified = true;
        await otpDoc.save();

        return res.json({
            success: true,
            message: 'WhatsApp OTP verified successfully',
            otpId: otpDoc._id,
            verifiedAt: new Date()
        })
    } catch (err) {
        return res.status(500).json({
            message: 'Failed to verify WhatsApp OTP',
            error: err.message
        })
    }
}