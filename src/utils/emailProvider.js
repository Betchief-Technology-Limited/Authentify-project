// utils/emailProvider.js
export const getEmailProvider = () => {
    if (process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS) return 'smtp';
    if (process.env.SENDGRID_API_KEY) return 'sendgrid';
    return 'mock';
};

