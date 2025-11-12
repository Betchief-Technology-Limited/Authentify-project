// utils/emailProvider.js
import getSmtpPassword from "./sesSmtpPassword.js";

export const getEmailProvider = async () => {
    // Fetch SMTP password dynamically from AWS
    const smtpPassword = getSmtpPassword(process.env.AWS_SECRET_KEY, process.env.SMTP_REGION);

    // Determine which email service to use
    if (process.env.SMTP_HOST && process.env.SMTP_USER && smtpPassword) {
        return 'smtp';
    }

    if (process.env.SENDGRID_API_KEY) {
        return 'sendgrid';
    }

    return 'mock';
};


