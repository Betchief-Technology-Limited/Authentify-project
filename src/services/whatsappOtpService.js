import { generateSecret, bufferToBase32, totp } from "authentifyotp";
import Otp from "../models/otp.js";
import { sendWhatsappMessage } from "./whatsappProviderService.js";
import { checkBalance, deduct } from "./walletService.js";

export const createAndSendOtpWhatsapp = async ({ admin, to, otpLength}) => {
    // 1. Check wallet balance
    const hasBalance = await checkBalance(admin._id);
    if(!hasBalance) throw new Error('Insufficient wallet balance');

    // Generate secret + OTP
    const rawSecret = generateSecret(32);
    const secretBase32 = bufferToBase32(rawSecret);

    // Use otpLength directly (default = 6, min = 4 and max = 8)
    const otpLen = Math.max(4, Math.min(parseInt(otpLength) || 6, 8))
    const code = totp(secretBase32, { digits: otpLen });

    // 3. Send via whatsapp provider
    const messageText = `Your verification code is ${code}. It will expire in ${Math.floor(parseInt(process.env.OTP_TTL_SECONDS || '300', 10) / 60)} minute(s).`;

    const whatsappResp = await sendWhatsappMessage(to, messageText);

    // 4. Save OTP record
    const otpDoc = await Otp.create({
        admin: admin._id,
        to,
        secret: secretBase32,
        expiresAt: new Date(
            Date.now() + parseInt(process.env.OTP_TTL_SECONDS || '300', 10) * 1000
        ),
        status: whatsappResp.success ? 'delivered' : 'failed',
        provider: 'whatsapp',
        providerMessageId: whatsappResp.messageId,
        providerRaw: whatsappResp.raw
    });

    //( 5. Deduct from wallet per API call
    if(whatsappResp.success) {
        await deduct(admin._id, parseFloat(process.env.WHATSAPP_API_COST || '1000000'))
    }

    return { otpDoc, whatsappResp }
}