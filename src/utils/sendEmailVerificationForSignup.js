import nodemailer from 'nodemailer';
import getSmtpPassword from './sesSmtpPassword.js';

const {
    SMTP_HOST,
    SMTP_PORT,
    SMTP_USER,
    EMAIL_FROM,
    SMTP_SECURE,
    AWS_SECRET_KEY
} = process.env

const smtpPass = getSmtpPassword(AWS_SECRET_KEY, process.env.SMTP_REGION);

export const sendVerificationEmail = async (email, name, verificationUrl) => {
    try {
        const transporter = nodemailer.createTransport({
            host: SMTP_HOST,
            port: Number(SMTP_PORT || 587),
            secure: String(SMTP_SECURE) === 'true',
            auth: {
                user: SMTP_USER,
                pass: smtpPass
            }
        });

        const mailOptions = {
            from: EMAIL_FROM,
            to: email,
            subject: "Verify your email address",
            html: `
                <div style="font-family:Arial,sans-serif;padding:20px;line-height:1.6">
                <h2>Hello ${name},</h2>
                <p>Thank you for signing up on <b>Authentify</b>.</p>
                <p>Please verify your email by clicking the button below:</p>
                <a href="${verificationUrl}" 
                    style="display:inline-block;background:#2563eb;color:#fff;
                    padding:10px 20px;border-radius:5px;text-decoration:none;">
                    Verify Email
                </a>
                <p>If you did not create an account, you can ignore this message.</p>
                <p>Best regards,<br/>Authentify Team</p>
                </div>
      `,
        };

        await transporter.sendMail(mailOptions);
        console.log(`✅ Verification email sent to ${email}`)
    } catch (error) {
        console.error("❌ Failed to send verification email:", error.message)
    }
}