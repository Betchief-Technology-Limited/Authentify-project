import Otp from "../models/otp.js";
import { generateSecret, totp, totpVerify } from "authentifyotp";
import { sendSmsViaMobishastra } from "../services/mobishastraService.js";
import { createAndSendOtpWhatsapp } from "../services/whatsappOtpService.js";
import { createAndSendOtpTelegram } from "../services/telegramOtpService.js";
import { checkBalance, deduct } from "../services/walletService.js";
import { v4 as uuidv4 } from "uuid";
import makeOptions from "../utils/makeOptionsFunction.js";


// Generate selectable OTP (SMS, Whatsapp, Telegram)
export const generateSelectableOtp = async (req, res) => {
    try {
        const { to, channel = 'sms', digits = 2, optionsCount = 3, deviceFingerprint, otpLength } = req.body;

        if (!to) return res.status(400).json({ message: "`to` (recipient) is required" });

        // 1️⃣ Generate secret + correct OTP
        const secret = generateSecret();
        const correctOtp = totp(secret, { digits });

        // 2️⃣ Generate options array (decoys + correct)
        const options = makeOptions(correctOtp, optionsCount, digits);

        // 3️⃣ Save OTP doc
        const requestId = uuidv4();
        const ttlSeconds = parseInt(process.env.OTP_TTL_SECONDS || "90", 10);
        const expiresAt = new Date(Date.now() + ttlSeconds * 1000);


        const otpDoc = await Otp.create({
            admin: req.admin._id,
            to,
            secret,
            options,
            requestId,
            deviceFingerprint,
            ttlSeconds,
            expiresAt,
            status: 'pending',
            verified: false,
            attempts: 0,
            maxAttempts: 1,
            meta: { digits, optionsCount, channel }
        });

        let sendResp;

        // 4️⃣ Send OTP based on channel
        if (channel === 'sms') {
            const smsCost = parseFloat(process.env.SMS_API_COST || '10');
            const hasBalance = await checkBalance(req.admin._id, smsCost);
            if (!hasBalance) return res.status(400).json({ message: 'Insufficient wallet balance for SMS OTP' });

            sendResp = await sendSmsViaMobishastra(to, `Your verification code is ${correctOtp}. It expires in ${ttlSeconds} seconds.`);
            if (sendResp.success) await deduct(req.admin._id, smsCost, 'Selectable OTP sent via SMS');
        } else if (channel === 'whatsapp') {
            const whatsappCost = parseFloat(process.env.WHATSAPP_API_COST || '20');
            const hasBalance = await checkBalance(req.admin._id, whatsappCost);
            if (!hasBalance) return res.status(400).json({ message: 'Insufficient wallet balance for WhatsApp OTP' });

            sendResp = await createAndSendOtpWhatsapp({ admin: req.admin, to, otpLength: otpLength || digits });
            // Deduction handles already inside the service for the whatsapp
        } else if (channel === 'telegram') {
            const telegramCost = parseFloat(process.env.TG_GATEWAY_API_COST || '50');
            const hasBalance = await checkBalance(req.admin._id, telegramCost);
            if (!hasBalance) return res.status(400).json({ message: 'Insufficient wallet balance for Telegram OTP' });

            sendResp = await createAndSendOtpTelegram({ admin: req.admin, to, otpLength: otpLength || digits });
            // Deduction handled inside telegram service
        } else {
            return res.status(400).json({ message: 'Unsupported channel' })
        }

        // 5️⃣ Return options array + requestId to client
        return res.status(200).json({
            success: true,
            message: 'Selectable OTP generated and sent',
            requestId: otpDoc.requestId,
            otpId: otpDoc._id,
            options: otpDoc.options,
            expiresAt: otpDoc.expiresAt,
            sendResp
        })

    } catch (err) {
        console.error('Selectable OTP generation error:', err);
        return res.status(500).json({ message: 'Failed to generate selectable OTP', error: err.message })
    }
};

// Verify selectable OTP
export const verifySelectableOtp = async (req, res) => {
    try {
        const { requestId, chosen, deviceFingerprint } = req.body;

        if (!requestId || !chosen) return res.status(400).json({ message: 'requestId and chosen OTP are required' });

        const otpDoc = await Otp.findOne({ requestId, admin: req.admin._id });
        if (!otpDoc) return res.status(404).json({ message: 'OTP request not found' });
        if (otpDoc.verified) return res.status(400).json({ message: 'OTP already verified' });
        if (otpDoc.expiresAt < new Date()) {
            otpDoc.status = 'failed';
            await otpDoc.save();
            return res.status(400).json({ message: 'OTP expired' })
        }

        if (otpDoc.deviceFingerprint && deviceFingerprint && otpDoc.deviceFingerprint !== deviceFingerprint) {
            return res.staus(401).json({ message: 'Device mismatch' });
        }

        otpDoc.attempts += 1;
        if (otpDoc.attempts > otpDoc.maxAttempts) {
            otpDoc.status = 'failed';
            await otpDoc.save();
            return res.status(429).json({ message: 'Maximum verification attempts exceeded' })
        }

        const correctOtp = totp(otpDoc.secret, { digits: otpDoc.meta?.digits || 2 });
        if (chosen === correctOtp) {
            otpDoc.verified = true;
            otpDoc.status = 'delivered';
            await otpDoc.save();
            return res.status(200).json({ success: true, message: 'OTP verified successfully', requestId })
        } else {
            await otpDoc.save();
            return res.status(400).json({ success: false, message: 'Incorrect OTP' });
        }
    } catch(err){
        console.error('Selectable OTP verification error:', err);
        return res.status(500).json({ message: 'Failed to verify selectable OTP', error: err.message })
    }
}
