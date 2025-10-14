import { generateSecret, bufferToBase32, totp } from "authentifyotp";
import Otp from "../models/otp.js";
import { sendSmsViaMobishastra } from "./mobishastraService.js";
import { checkBalance, deduct } from "./walletService.js";

// Create and send OTP via Mobishastra
export const createAndSendOtpSms = async ({ admin, to, otpLength }) => {

    //  1) Check wallet balance
    const hasBalance = await checkBalance(admin._id);
    if (!hasBalance) {
        throw new Error('Insufficient wallet balance. Please top-up so as to be able to send OTP ');
    }

    // 2) generate secret and code
    const rawSecret = generateSecret(32); //Buffer from authentify lib call
    const secretBase32 = bufferToBase32(rawSecret) //Store safe base32

    // ✅ Use otpLength directly (default = 6, min = 4, max = 8)
    const otpLen = Math.max(4, Math.min(parseInt(otpLength) || 6, 8));
    const code = totp(secretBase32, { digits: otpLen }) //authentify library call to generate OTP- returns different length of Otp code based on client choice.

    // 3) send via mobishastra
    const messageText = `Your authentify verification code is ${code}. It expires in ${Math.floor(
        parseInt(process.env.OTP_TTL_SECONDS || "300", 10) / 60
    )} minute(s).`;

    const smsResp = await sendSmsViaMobishastra(to, messageText);

    // 4) store OTP record (do NOT store code directly, store secret + expiry)
    const otpDoc = await Otp.create({
        admin: admin ? admin._id : null,
        to,
        secret: secretBase32,
        expiresAt: new Date(
            Date.now() + parseInt(process.env.OTP_TTL_SECONDS || "300", 10) * 1000
        ),
        status: smsResp.success ? "pending" : "failed",
        provider: "mobishastra",
        providerMessageId: smsResp.messageId,
        providerResponseCode: smsResp.responseCode,
        providerRaw: smsResp.raw
    });

    // 5) Deduct wallet per OTP sent
    if(smsResp.success){
        await deduct(admin._id, parseFloat(process.env.SMS_API_COST || '10'));
    }

    return { otpDoc, smsResp }
}




// // TESTING VIA CONSOLE.LOG
// import { generateSecret, bufferToBase32, totp } from "authentifyotp";
// import Otp from "../models/otp.js";
// import { sendSmsViaMobishastra } from './mobishastraService.js';
// import { checkBalance, deduct } from './walletService.js'

// export const createAndSendOtpSms = async ({ admin, to, otpLength }) => {
//     // Check wallet balance(skip in test mode);

//     if (process.env.TEST_MODE !== 'true') {
//         const hasBalance = await checkBalance(admin._id);
//         if (!hasBalance) {
//             throw new Error('Insufficient wallet balance. Please top-up to send OTP')
//         }
//     }

//     // 2) Generate secret and code
//     const rawSecret = generateSecret(32);
//     const secretBase32 = bufferToBase32(rawSecret);

//     const otpLen = Math.max(4, Math.min(parseInt(otpLength) || 6, 8));
//     const code = totp(secretBase32, { digits: otpLen });


//     // 3) Handle SMS sending
//     let smsResp = { success: true, messageId: "TEST1234", responseCode: "200", raw: "TEST_MODE" };

//     if (process.env.TEST_MODE !== "true") {
//         const messageText = `Your Authentify verification code is ${code}. It expires in ${Math.floor(
//             parseInt(process.env.OTP_TTL_SECONDS || "300", 10) / 60
//         )} minute(s).`;
//         smsResp = await sendSmsViaMobishastra(to, messageText);
//     } else {
//         console.log("🔹 [TEST MODE] OTP generated:", code);
//     }

//     // 4) Store OTP record
//     const otpDoc = await Otp.create({
//         admin: admin ? admin._id : null,
//         to,
//         secret: secretBase32,
//         expiresAt: new Date(Date.now() + parseInt(process.env.OTP_TTL_SECONDS || "300", 10) * 1000),
//         status: smsResp.success ? "pending" : "failed",
//         provider: process.env.TEST_MODE === "true" ? "test" : "mobishastra",
//         providerMessageId: smsResp.messageId,
//         providerResponseCode: smsResp.responseCode,
//         providerRaw: smsResp.raw,
//     });

//     // 5) Skip wallet deduction in test mode
//     if (smsResp.success && process.env.TEST_MODE !== "true") {
//         await deduct(admin._id, parseFloat(process.env.SMS_API_COST || "10"));
//     }

//     return { otpDoc, smsResp, code }; // returning code in test mode helps you debug
// }
