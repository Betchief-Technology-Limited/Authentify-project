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
import Email from '../models/email.js';
import Transaction from '../models/transaction.js';
import Wallet from '../models/wallet.js';
import EmailTemplate from '../models/emailTemplate.js';
import getSmtpPassword from '../utils/sesSmtpPassword.js';
import { getEmailProvider } from '../utils/emailProvider.js';
import { sendViaSendGrid } from '../utils/sendGridProvider.js';

const EMAIL_COST = parseFloat(process.env.EMAIL_API_COST || '1');

// AWS SES SMTP credentials
const AWS_SECRET_KEY = process.env.AWS_SECRET_KEY;
const SMTP_PASS = getSmtpPassword(AWS_SECRET_KEY, process.env.SMTP_REGION);
const SMTP_HOST = process.env.SMTP_HOST;
const SMTP_USER = process.env.SMTP_USER;
const SMTP_PORT = process.env.SMTP_PORT;
const SMTP_SECURE = process.env.SMTP_SECURE;
const SMTP_REJECT_UNAUTHORIZED = process.env.SMTP_REJECT_UNAUTHORIZED;
const SMTP_ENVELOPE_FROM = process.env.SMTP_ENVELOPE_FROM;
const EMAIL_FROM = process.env.EMAIL_FROM;

let transporter = null;

// ------------------------------------------------------------------
// ✅ Transporter Factory (cache-enabled)
// ------------------------------------------------------------------
const getTransporter = () => {
    if (transporter) return transporter;

    // Corrected logic: ensure all 3 exist
    if (!SMTP_HOST || !SMTP_USER || !AWS_SECRET_KEY) {
        console.error('SMTP config missing required values');
        return null;
    }

    const smtpPass = getSmtpPassword(AWS_SECRET_KEY, process.env.SMTP_REGION)

    transporter = nodemailer.createTransport({
        host: SMTP_HOST,
        port: parseInt(SMTP_PORT || '587', 10),
        secure: SMTP_SECURE === 'true',
        auth: {
            user: SMTP_USER,
            pass: smtpPass
        },
        tls: {
            rejectUnauthorized: SMTP_REJECT_UNAUTHORIZED !== 'false'
        },
    });
    console.log('✅ AWS SES SMTP transporter initialized.');
    return transporter;
};

// ------------------------------------------------------------------
// ✅ Send via AWS SES SMTP
// ------------------------------------------------------------------
const sendViaSmtp = async ({ from, to, subject, body }) => {
    const t = getTransporter();
    if (!t) return { ok: false, error: 'SMTP not configured' };

    const envelopeFrom = SMTP_ENVELOPE_FROM || EMAIL_FROM || SMTP_USER;

    const mailOptions = {
        from: from || EMAIL_FROM || SMTP_USER,
        to,
        subject,
        html: body,
        envelope: {
            from: envelopeFrom,
            to
        },
    };
    try {
        const info = await t.sendMail(mailOptions);
        console.log('✅ SES Email sent:', info.messageId || info);
        return { ok: true, raw: info }
    } catch (err) {
        console.error('❌ SES send error:', err);
        return { ok: false, error: err.message || String(err) };
    }   
};

// ------------------------------------------------------------------
// ✅ Template Creation
// ------------------------------------------------------------------
export const createTemplate = async ({ admin, name, subject, body, description }) => {
    const tpl = await EmailTemplate.findOneAndUpdate(
        { admin: admin._id, name },
        { subject, body, description, admin: admin._id },
        { upsert: true, new: true }
    );
    return tpl;
};

// ------------------------------------------------------------------
// ✅ Core Send Flow
// ------------------------------------------------------------------
export const sendEmail = async ({ admin, from, to, subject, body, templateId, provider }) => {
    // 1️⃣ Check wallet
    const wallet = await Wallet.findOne({ admin: admin._id });
    if (!wallet || wallet.balance < EMAIL_COST) {
        throw new Error('Insufficient wallet balance. Please top-up to send email.');
    }

    // 2️⃣ Create transaction (pending)
    const tx_ref = `email_${admin._id}_${Date.now()}`;
    const transaction = await Transaction.create({
        admin: admin._id,
        tx_ref,
        amount: EMAIL_COST,
        status: 'pending',
        provider: 'email_service',
        description: `Email send to ${to}`,
    });

    // 3️⃣ Determine provider
    const resolvedProvider = provider || getEmailProvider();

    // 4️⃣ Create email record (pending)
    const emailDoc = await Email.create({
        admin: admin._id,
        from,
        to,
        subject,
        body,
        template: templateId || null,
        status: 'pending',
        tx_ref,
        provider: resolvedProvider,
    });

    // 5️⃣ Send using selected provider
    let sendResp;
    try {
        if (resolvedProvider === 'smtp') {
            sendResp = await sendViaSmtp({ from, to, subject, body });
        } else if (resolvedProvider === 'sendgrid') {
            sendResp = await sendViaSendGrid({ from, to, subject, body });
        } else {
            sendResp = { ok: true, mock: true, message: 'Mock send OK' };
        }
    } catch (err) {
        sendResp = { ok: false, error: err.message || String(err) };
    }

    // 6️⃣ Update records & wallet
    if (sendResp.ok) {
        wallet.balance -= EMAIL_COST;
        wallet.history.push({
            type: 'debit',
            amount: EMAIL_COST,
            description: `Email send to ${to}`,
        });
        await wallet.save();

        emailDoc.status = 'sent';
        emailDoc.providerResponse = sendResp;
        await emailDoc.save();

        transaction.status = 'successful';
        transaction.rawPayLoad = sendResp;
        await transaction.save();
    } else {
        emailDoc.status = 'failed';
        emailDoc.providerResponse = sendResp;
        await emailDoc.save();

        transaction.status = 'failed';
        transaction.rawPayLoad = sendResp;
        await transaction.save();
    }

    return { emailDoc, transaction, sendResp };
};

// ------------------------------------------------------------------
// ✅ Fetch Template
// ------------------------------------------------------------------
export const getTemplate = async ({ admin, name }) => {
    return await EmailTemplate.findOne({ admin: admin._id, name });
};
