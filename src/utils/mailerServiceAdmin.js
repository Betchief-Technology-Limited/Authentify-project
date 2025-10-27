import nodemailer from 'nodemailer';


const {
    SMTP_HOST,
    SMTP_PORT,
    SMTP_USER,
    SMTP_PASS,
    EMAIL_FROM,
    SMTP_SECURE,
    SMTP_FROM_NAME
} = process.env

// const smtpPass = getSmtpPassword(AWS_SECRET_KEY, process.env.SMTP_REGION);

const transporter = nodemailer.createTransport({
    host: SMTP_HOST,
    port: Number(SMTP_PORT || 587),
    secure: String(SMTP_SECURE) === 'true',
    auth: {
        user: SMTP_USER,
        pass: SMTP_PASS
    }
});

export async function sendMail({ to, subject, html, text }) {
    const from = `${SMTP_FROM_NAME || 'Authentify Primex360'} <${EMAIL_FROM}>`;

    return transporter.sendMail({
        from,
        to,
        subject,
        text,
        html
    });
}