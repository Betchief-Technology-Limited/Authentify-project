import { generateSecret, bufferToBase32, totp } from "authentifyotp";
import Otp from "../models/otp.js";
import { sendWhatsappMessage } from "./whatsappProviderService.js";
import { checkBalance, deduct } from "./walletService.js";
import { getIO } from "../config/socket.js";
import Transaction from "../models/transaction.js";
import { v4 as uuidv4 } from 'uuid';


export const createAndSendOtpWhatsapp = async ({ admin, to, otpLength }) => {
    // 1. Check wallet balance
    const whatsappCost = parseFloat(process.env.WHATSAPP_API_COST || '20')
    const hasBalance = await checkBalance(admin._id, whatsappCost);
    if (!hasBalance) throw new Error('Insufficient wallet balance for WhatsaApp OTP');

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
    if (whatsappResp.success) {
        await deduct(admin._id, whatsappCost, 'WhatsApp OTP sent');

        // Create transaction record for analytics
        const txRef = `otp_whatsapp_${admin._id}_${Date.now()}_${uuidv4().slice(0,6)}`;

        await Transaction.create({
            admin: admin._id,
            tx_ref: txRef,
            amount: whatsappCost,
            status: 'successful',
            provider: 'whatsapp',
            serviceType: 'otp',
            subservice: 'whatsapp',
            description: 'Whatsapp OTP sent',
            rawPayLoad: whatsappResp.raw || {}
        })

        getIO().emit("otp_activity", {
            service: "whatsapp",
            admin: admin._id,
            amount: whatsappCost,
            timestamp: new Date(),
            message: "WhatApp OTP sent successfully!!!"
        });
    }

    return { otpDoc, whatsappResp }
}