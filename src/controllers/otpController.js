import Otp from "../models/otp.js";
import { createAndSendOtpSms } from "../services/otpService.js";
import { totpVerify } from "authentifyotp";

export const sendSmsOtp = async (req, res) => {
    try {
        const { to, otpLength } = req.body; //otpLength allows client to specify the number of OTP code that needs to be sent to their users.

        if (!to) {
            return res.status(400).json({ message: "`to` (recipient phone) is required in request body" });
        }

        const result = await createAndSendOtpSms({
            admin: req.admin,
            to,
            otpLength //👈Forward client's requested OTP length
        });

        if (!smsResp.success) {
            return res.status(502).json({
                success: false,
                message: "Mobishastra failed to send SMS",
                providerCode: smsResp.responseCode,
                providerRaw: smsResp.raw
            });
        }

        return res.status(200).json({
            success: true,
            message: 'OTP generated and SMS delivered successfully',
            sms: result.smsResp,
            otpId: result.otpDoc._id,
            expiresAt: result.otpDoc.expiresAt
        });

        // return res.status(200).json({
        //     success: true,
        //     message: 'OTP generated and SMS request sent via Mobishastra',
        //     sms: result.smsResp,
        //     otpId: result.otpDoc._id,
        //     expiresAt: result.otpDoc.expiresAt
        // });
    } catch (err) {
        return res.status(500).json({
            message: 'Failed to send OTP',
            error: err.message
        })
    }
};


// Verify OTP code
export const verifySmsOtp = async (req, res) => {
    try {
        const { otpId, code } = req.body;

        if (!otpId || !code) {
            return res.status(400).json({ message: 'otpId and code are required' })
        }

        // Find OTP document
        const otpDoc = await Otp.findById(otpId);
        if (!otpDoc) {
            return res.status(404).json({ message: 'OTP record not found' });
        }

        // Already used?
        if (otpDoc.verified || otpDoc.status === 'delivered') {
            return res.status(400).json({ message: 'OTP already used' })
        }

        // Check expiry 
        if (otpDoc.expiresAt < new Date()) {
            return res.status(400).json({ message: 'OTP expired' })
        }

        // Verify code (token first, secret second)
        const isValid = totpVerify(code, otpDoc.secret, { window: 1 });
        if (!isValid) {
            return res.status(400).json({ message: 'Invalid OTP code' });
        }

        // Mark as verified
        otpDoc.status = 'delivered';
        otpDoc.verified = true;
        await otpDoc.save();

        return res.json({
            success: true,
            message: 'OTP verified successfully',
            otpId: otpDoc._id,
            verifiedAt: new Date()
        })
    } catch (err) {
        console.error('OTP verification error:', err.message);
        return res.status(500).json({ message: 'Failed to verify OTP', error: err.message });
    }
};