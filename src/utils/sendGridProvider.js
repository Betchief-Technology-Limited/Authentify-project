// utils/sendgridProvider.js
import sgMail from '@sendgrid/mail';

export const sendViaSendGrid = async ({ from, to, subject, body }) => {
    if (!process.env.SENDGRID_API_KEY) {
        return { ok: false, error: 'SendGrid API key not configured' };
    }

    sgMail.setApiKey(process.env.SENDGRID_API_KEY);

    try {
        const msg = {
            to,
            from: from || process.env.SENDGRID_FROM,
            subject,
            html: body,
        };

        const response = await sgMail.send(msg); // returns an array with info
        return { ok: true, raw: response };
    } catch (err) {
        return { ok: false, error: err.message || err.toString() };
    }
};
