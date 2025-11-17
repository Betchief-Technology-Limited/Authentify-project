import { SESClient, SendEmailCommand } from "@aws-sdk/client-ses";

const {
    AWS_ACCESS_KEY_ID,
    AWS_SECRET_ACCESS_KEY,
    AWS_REGION,
    SMTP_FROM_NAME,
    EMAIL_FROM
} = process.env;

// Create SES client (works on Render + localhost)
const ses = new SESClient({
    region: AWS_REGION || "us-east-1",
    credentials: {
        accessKeyId: AWS_ACCESS_KEY_ID,
        secretAccessKey: AWS_SECRET_ACCESS_KEY,
    },
});

export async function sendMail({ to, subject, html, text }) {
    const fromAddress = `${SMTP_FROM_NAME || "Authentify"} <${EMAIL_FROM}>`;

    const params = {
        Source: fromAddress,
        Destination: {
            ToAddresses: Array.isArray(to) ? to : [to],
        },
        Message: {
            Subject: { Data: subject },
            Body: {
                Html: { Data: html || "" },
                Text: { Data: text || "" }
            }
        }
    };

    try {
        const command = new SendEmailCommand(params);
        const response = await ses.send(command);
        console.log("📩 Email sent:", response.MessageId);
        return response;
    } catch (error) {
        console.error("❌ Email send failed:", error.message);
        throw error;
    }
}




































// import nodemailer from 'nodemailer';


// const {
//     SMTP_HOST,
//     SMTP_PORT,
//     SMTP_USER,
//     SMTP_PASS,
//     EMAIL_FROM,
//     SMTP_SECURE,
//     SMTP_FROM_NAME
// } = process.env

// // const smtpPass = getSmtpPassword(AWS_SECRET_KEY, process.env.SMTP_REGION);

// const transporter = nodemailer.createTransport({
//     host: SMTP_HOST,
//     port: Number(SMTP_PORT || 587),
//     secure: String(SMTP_SECURE) === 'true',
//     auth: {
//         user: SMTP_USER,
//         pass: SMTP_PASS
//     }
// });

// export async function sendMail({ to, subject, html, text }) {
//     const from = `${SMTP_FROM_NAME || 'Authentify Primex360'} <${EMAIL_FROM}>`;

//     return transporter.sendMail({
//         from,
//         to,
//         subject,
//         text,
//         html
//     });
// }