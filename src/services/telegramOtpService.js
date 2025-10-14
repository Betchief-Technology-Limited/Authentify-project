import { generateSecret, bufferToBase32, totp, totpVerify } from "authentifyotp";
import Otp from "../models/otp.js";
import Transaction from "../models/transaction.js";
import { checkSendAbility, sendVerificationMessage } from "./telegramService.js";

export const createAndSendOtpTelegram = async ({ admin, to, otpLength }) => {
    //Ensure client subscribed to telegram in business logic(assuming apiKeyAuth ensures subscription)
    //Check send ability on Telegram
    const checkResp = await checkSendAbility(to);
    if (!checkResp || !checkResp.result) {
        throw new Error('Failed to check send ability');
    }
    const requestId = checkResp.result.request_id;
    if (!requestId) {
        throw new Error('Number not registered on Telegram')
    }

    // Generate secret + code
    const rawSecret = generateSecret(32);
    const secretBase32 = bufferToBase32(rawSecret);

    // Use otpLength directly (default = 6, min = 4, max = 8)
    const otpLen = Math.max(4, Math.min(parseInt(otpLength) || 6, 8))
    const code = totp(secretBase32, { digits: otpLen });

    // Create OTP doc(pending)
    const ttlSeconds = parseInt(process.env.OTP_TTL_SECONDS || '300', 10);
    const otpDoc = await Otp.create({
        admin: admin ? admin._id : null,
        to,
        secret: secretBase32,
        expiresAt: new Date(Date.now() + ttlSeconds * 1000),
        status: 'pending',
        provider: 'telegram',
        providerRequestId: requestId
    });

    // Create Transaction(pending) NB: tx_ref must be unique
    const tx_ref = `tgotp_${admin._id}_${Date.now()}`;
    const transaction = await Transaction.create({
        admin: admin._id,
        tx_ref,
        amount: parseFloat(process.env.TG_GATEWAY_API_COST || '50'),
        status: 'pending',
        provider: 'telegram',
        description: 'Telegram OTP send',
        rawPayLoad: { request_check: checkResp }
    });

    // Send via Gateway(include callback_url)
    const callbackUrl = `${process.env.APP_BASE_URL || 'http://localhost:3005'}/api/otp/telegram/webhook`;

    console.log('🔗 TELEGRAM CALLBACK URL =>', callbackUrl);
    console.log('PAYLOAD ABOUT TO BE SENT TO TELEGRAM =>', {
        to,
        code,
        requestId,
        callbackUrl,
        ttlSeconds,
        otpId: otpDoc._id.toString()
    });

    const sendResp = await sendVerificationMessage(
        to,
        code,
        requestId,
        callbackUrl,
        ttlSeconds,
        { otpId: otpDoc._id.toString(), tx_ref });


    // Send provider response
    otpDoc.providerRaw = sendResp;
    otpDoc.providerMessageId = sendResp.result?.message_id || null;
    otpDoc.providerResponseCode = sendResp.ok ? 'OK' : 'ERR';
    otpDoc.providerTransactionRef = tx_ref;
    await otpDoc.save();

    // If sendResp indicates immediate failure, update transaction/otp
    if (!sendResp.ok) {
        transaction.status = 'failed';
        transaction.rawPayLoad = sendResp;
        await transaction.save();
        otpDoc.status = 'failed';
        await otpDoc.save();
    }
    return { otpDoc, telegramResp: sendResp, transaction };
};

// Verify OTP telegram
export const verifyOtpTelegram = async ({ otpId, code }) => {
    const otpDoc = await Otp.findById(otpId);
    if (!otpDoc) throw new Error('OTP not found');

    // Check if it is already used
    if (otpDoc.verified) throw new Error('OTP already used');

    // Check if the code is expired or not
    if (otpDoc.expiresAt < new Date()) throw new Error('OTP expired');

    // Use totpVerify(token, secret, opts) - returns { ok }
    const { ok } = totpVerify(code, otpDoc.secret, { window: 1 })

    if (!ok) throw new Error('Invalid OTP code');

    otpDoc.status = 'delivered';
    otpDoc.verified = true;
    await otpDoc.save();

    return { otpId: otpDoc._id, verifiedAt: new Date() };

}