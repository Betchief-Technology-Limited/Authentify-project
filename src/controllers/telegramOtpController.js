import { createAndSendOtpTelegram, verifyOtpTelegram } from "../services/telegramOtpService.js";

export const sendTelegramOtp = async (req, res) => {
    try {
        const { to, otpLength } = req.body;
        if (!to) return res.status(400).json({ success: false, message: '`to` (recipient phone) is required' });

        // Create and send OTP
        const result = await createAndSendOtpTelegram({
            admin: req.admin,
            to,
            otpLength //👈Forward client's requested OTP length
        });

        return res.status(200).json({
            success: true,
            message: 'OTP generated and sent via Telegram',
            otpId: result.otpDoc._id,
            providerResp: result.telegramResp,
            transactionId: result.transaction._id
        })
    } catch (err) {
        console.error('sendTelegramOtp error:', err.message);
        return res.status(500).json({ success: false, message: err.message });
    }
};

export const verifyTelegramOtp = async (req, res) => {
    try {
        const { otpId, code } = req.body;
        if (!otpId || !code) return res.status(400).json({ success: false, message: 'otpId and code required' });

        const result = await verifyOtpTelegram({ otpId, code });

        return res.json({ success: true, message: 'OTP verified', ...result });
    } catch (err) {
        console.error('verifyTelegramOtp error:', err.message);
        return res.status(400).json({ success: false, message: err.message });
    }
}