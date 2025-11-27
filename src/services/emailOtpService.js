import { generateSecret, bufferToBase32, totp } from "authentifyotp";
import { v4 as uuidv4 } from 'uuid';
import Otp from "../models/otp.js";
import Transaction from "../models/transaction.js";
import { checkBalance, deduct } from "./walletService.js";
import { getIO } from "../config/socket.js";
import Subscription from "../models/subscription.js";

// UTILITIES
import { sendMail } from "../utils/mailerServiceAdmin.js";
import { sendEmailOtpTemplate } from "../utils/serviceAdminEmailTemplate.js";

const {
    EMAIL_API_COST,
    OTP_TTL_SECONDS
} = process.env


/**
 * createAndSendOtpEmail({ admin, to, otpLength })
 *
 * - admin: Admin object (req.admin)
 * - to: recipient email
 * - otpLength: requested digits (4-8)
 *
 * Returns: { otpDoc, sendResp }
 */

export async function createAndSendOtpEmail({ admin, to, otpLength }) {
    if (!admin || !admin._id) throw new Error("Admin (client) is required");
    if (!to) throw new Error("Recipient email `to` is required");

    // 1) ensure subscription to otp email subservice (optional depending on business rule)
    const subscribed = await Subscription.findOne({
        admin: admin._id,
        serviceType: "otp",
        subservice: "email",
        active: true,
        costPerCall: EMAIL_API_COST
    });

    if (!subscribed) {
        throw new Error("Client not subsrcibed to OTP email subservice");
    }

    // 2) Check wallet balance
    const cost = parseInt(EMAIL_API_COST);
    const hasBalance = await checkBalance(admin._id, cost);
    if (!hasBalance) {
        throw new Error("Insufficient wallet balance for email OTP");
    }

    // 3) generate secret & OTP code(do not store code)
    const rawSecret = generateSecret(32);
    const secretBase32 = bufferToBase32(rawSecret);

    const otpLen = Math.max(4, Math.min(parseInt(otpLength || 6, 10), 8));
    const code = totp(secretBase32, { digits: otpLen });

    //   4) prepare emsil content using template utility
    const template = sendEmailOtpTemplate(code)

    // 5) Send email using sendMail utility
    let sendResp;
    try {
        const emailResp = await sendMail({
            to,
            subject: template.subject,
            html: template.html,
            text: template.text
        });

        sendResp = {
            success: true,
            messageId: emailResp.MessageId,
            raw: emailResp
        }
    } catch (err) {
        sendResp = {
            success: false,
            error: err.message,
            raw: err
        };
    }

    /**
 * 6️ CREATE OTP DOCUMENT
 */

    const expiresAt = new Date(Date.now() + OTP_TTL_SECONDS * 1000);

    const otpDoc = await Otp.create({
        admin: admin._id,
        to,
        secret: secretBase32,
        expiresAt,
        provider: "aws_ses",
        status: sendResp.success ? "pending" : "failed",
        providerMessageId: sendResp.messageId || null,
        providerRaw: sendResp.raw || {}
    });

    // 7 If successful => deduct wallet + create transaction
    if (sendResp.success) {
        await deduct(admin._id, cost, "Email OTP sent");

        const txRef = `otp_email_${admin._id}_${Date.now()}_${uuidv4().slice(0, 6)}`;

        await Transaction.create({
            admin: admin._id,
            tx_ref: txRef,
            amount: cost,
            status: "successful",
            provider: "aws_ses",
            serviceType: "otp",
            subservice: "email",
            description: `Email OTP sent to ${to}`,
            rawPayLoad: sendResp.raw || {}
        })
    }

    // 8 Socket event
    try {
        const io = getIO();
        if (io) {
            io.emit("otp_activity", {
                service: "email",
                admin: admin._id,
                amount: cost,
                timestamp: new Date(),
                message: "Email OTP sent"
            });
        }
    } catch (e) {
        console.warn("Socket emit failed:", e.message);
    }

    // 9 return standard response
    return { otpDoc, sendResp }

}
