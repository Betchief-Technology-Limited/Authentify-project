// import nodemailer from 'nodemailer';
// import Email from '../models/email.js';
// import Transaction from '../models/transaction.js';
// import Wallet from '../models/wallet.js';
// import EmailTemplate from '../models/emailTemplate.js';

// const EMAIL_COST = parseFloat(process.env.EMAIL_API_COST || '1'); // default per-call cost

// // helper to actually send using SMTP if configured
// const sendViaSmtp = async ({ to, subject, body }) => {
//     if (!process.env.SMTP_HOST || !process.env.SMTP_USER || !process.env.SMTP_PASS) {
//         return { ok: false, error: 'SMTP not configured' };
//     }

//     const transporter = nodemailer.createTransport({
//         host: process.env.SMTP_HOST,
//         port: parseInt(process.env.SMTP_PORT || '587', 10),
//         secure: (process.env.SMTP_SECURE === 'true'), // true for 465, false for 587
//         auth: {
//             user: process.env.SMTP_USER,
//             pass: process.env.SMTP_PASS
//         }
//     });

//     const info = await transporter.sendMail({
//         from: process.env.EMAIL_FROM || process.env.SMTP_USER,
//         to,
//         subject,
//         html: body
//     });

//     return { ok: true, raw: info };
// };

// export const createTemplate = async ({ admin, name, subject, body, description }) => {
//     const tpl = await EmailTemplate.findOneAndUpdate(
//         { admin: admin._id, name },
//         { subject, body, description, admin: admin._id },
//         { upsert: true, new: true }
//     );
//     return tpl;
// };

// // core send flow
// export const sendEmail = async ({ admin, to, subject, body, templateId }) => {
//     // 1) Check wallet
//     const wallet = await Wallet.findOne({ admin: admin._id });
//     if (!wallet || wallet.balance < EMAIL_COST) {
//         throw new Error('Insufficient wallet balance. Please top-up to send email.');
//     }

//     // 2) Create transaction (pending)
//     const tx_ref = `email_${admin._id}_${Date.now()}`;
//     const transaction = await Transaction.create({
//         admin: admin._id,
//         tx_ref,
//         amount: EMAIL_COST,
//         status: 'pending',
//         provider: 'email_service',
//         description: 'Email send'
//     });

//     // 3) Create Email record (pending)
//     const emailDoc = await Email.create({
//         admin: admin._id,
//         to,
//         subject,
//         body,
//         template: templateId || null,
//         status: 'pending',
//         tx_ref
//     });

//     // 4) Send (real or mock)
//     let sendResp;
//     if (process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS) {
//         try {
//             sendResp = await sendViaSmtp({ to, subject, body });
//         } catch (err) {
//             sendResp = { ok: false, error: err.message };
//         }
//     } else {
//         // mock mode
//         sendResp = { ok: true, mock: true, message: 'Mock send OK' };
//     }

//     // 5) Update email doc & transaction & wallet
//     if (sendResp.ok) {
//         // deduct wallet now
//         wallet.balance = (wallet.balance || 0) - EMAIL_COST;
//         wallet.history.push({
//             type: 'debit',
//             amount: EMAIL_COST,
//             description: `Email send to ${to}`
//         });
//         await wallet.save();

//         emailDoc.status = 'sent';
//         emailDoc.providerResponse = sendResp;
//         await emailDoc.save();

//         transaction.status = 'successful';
//         transaction.rawPayLoad = sendResp;
//         await transaction.save();
//     } else {
//         emailDoc.status = 'failed';
//         emailDoc.providerResponse = sendResp;
//         await emailDoc.save();

//         transaction.status = 'failed';
//         transaction.rawPayLoad = sendResp;
//         await transaction.save();
//     }

//     return { emailDoc, transaction, sendResp };
// };

// export const getTemplate = async ({ admin, name }) => {
//     const tpl = await EmailTemplate.findOne({ admin: admin._id, name });
//     return tpl;
// };

import nodemailer from 'nodemailer';
import Email from '../models/email';
import Transaction from '../models/transaction';
import Wallet from '../models/wallet';
import EmailTemplate from '../models/emailTemplate';
import getSmtpPassword from '../utils/sesSmtpPassword';
import { getEmailProvider } from '../utils/emailProvider';

const EMAIL_COST = parseFloat(process.env.EMAIL_API_COST || '1');

const AWS_SECRET_KEY = process.env.AWS_SECRET_KEY;
const SMTP_PASS = getSmtpPassword(AWS_SECRET_KEY, process.env.SMTP_REGION);
const SMTP_HOST = process.env.SMTP_HOST;
const SMTP_USER = process.env.SMTP_USER;
const SMTP_PORT = process.env.SMTP_PORT;
const SMTP_SECURE = process.env.SMTP_SECURE;
const SMTP_REJECT_UNAUTHORIZED = process.env.SMTP_REJECT_UNAUTHORIZED;
const SMTP_ENVELOPE_FROM = process.env.SMTP_ENVELOPE_FROM;
const EMAIL_FROM = process.env.EMAIL_FROM

//cache transporter so we do not recreate it every request
let transporter = null;

const getTransporter = () => {
    if (transporter) return transporter;

    // if SMTP not configured, return null
    if (!SMTP_HOST || !SMTP_USER || SMTP_PASS) {
        return null;
    }

    transporter = nodemailer.createTransport({
        host: SMTP_HOST,
        port: parseInt(SMTP_PORT || '587', 10),
        secure: (SMTP_SECURE === 'true'), //true for 465, false for 587
        auth: {
            user: SMTP_USER,
            pass: SMTP_PASS
        },

        //this is to avoid self-signed issues
        tls: {
            rejectUnauthorized: SMTP_REJECT_UNAUTHORIZED !== 'false'
        }
    });

    return transporter
}

// Send using SMTP; supports custom `from` (display name + email)
const sendViaSmtp = async ({ from, to, subject, body }) => {
    const t = getTransporter();
    if (!t) return { ok: false, error: 'SMTP not configured' };

    // `envelope` ensures real MAIL FROM (envelope) and prevents some provider issues. 
    // If you want to set a separate envelope.from, set process.env.ENVELOPE_FROM
    const envelopeFrom = SMTP_ENVELOPE_FROM || (EMAIL_FROM || SMTP_USER);

    const mailOptions = {
        from: from || EMAIL_FROM || SMTP_USER,
        to,
        subject,
        html: body,
        envelope: {
            from: envelopeFrom,
            to
        }
    };

    const info = await t.sendMail(mailOptions);
    return { ok: true, raw: info }
};

export const createTemplate = async ({ admin, name, subject, body, description }) => {
    const tpl = await EmailTemplate.findOneAndUpdate(
        { admin: admin._id, name },
        { subject, body, description, admin: admin._id },
        { upsert: true, new: true }
    );
    return tpl;
};

// core send flow 

export const sendEmail = async ({ admin, from, to, subject, templateId }) => {
    // 1) check wallet
    const wallet = await Wallet.findOne({ admin: admin._id });
    if (!wallet || wallet.balance < EMAIL_COST) {
        throw new Error('Insufficient wallet balance. Please top-up to send email')
    }

    // 2) Create transaction (pending)
    const tx_ref = `email_${admin._id}_${Date.now()}`;
    const transaction = await Transaction.create({
        admin: admin._id,
        tx_ref,
        amount: EMAIL_COST,
        status: 'pending',
        provider: 'email_service',
        description: `Email send to ${to}`
    });

    //  3) Create Email record (pending)
    const emailDoc = await Email.create({
        admin: admin._id,
        to,
        subject,
        body,
        template: templateId || null,
        status: 'pending',
        tx_ref,
        provider: getEmailProvider()
    });

    // 4) Send (real or mock)
    let sendResp;
    if (SMTP_HOST && SMTP_USER && SMTP_PASS) {
        try {
            sendResp = await sendViaSmtp({ from, to, subject, body })
        } catch (err) {
            sendResp = { ok: false, error: err.message || String(err) };
        }
    } else {
        sendResp = { ok: true, mock: true, message: 'Mock send Ok' }
    }

    // 5) Update email doc & transaction & wallet
    if (sendResp.ok) {
        // deduct wallet now
        wallet.balance = (wallet.balance || 0) - EMAIL_COST;
        wallet.history.push({
            type: 'debit',
            amount: EMAIL_COST,
            description: `Email send to ${to}`
        });

        await wallet.save();

        emailDoc.status = 'sent';
        emailDoc.providerResponse = sendResp;
        await emailDoc.save();

        transaction.status = 'successful';
        transaction.rawPayLoad = sendResp;
        await emailDoc.save();
    } else {
        emailDoc.status = 'failed';
        emailDoc.providerResponse = sendResp;
        await emailDoc.save();

        transaction.status = 'failed';
        transaction.rawPayLoad = sendResp;
        await transaction.save();
    }

    return { emailDoc, transaction, sendResp };
}

export const getTemplate = async ({ admin, name }) => {
    const tpl = await EmailTemplate.findOne({ admin: admin._id, name });
    return tpl;
}