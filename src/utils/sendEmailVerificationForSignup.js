import { SESClient, SendEmailCommand } from "@aws-sdk/client-ses";

const ses = new SESClient({
    region: "us-east-1",
    credentials: {
        accessKeyId: process.env.SMTP_USER,        // Your SES SMTP username (AKIA…)
        secretAccessKey: process.env.AWS_SECRET_KEY, // Your SES IAM secret key
    },
});

export const sendVerificationEmail = async (email, name, verificationUrl) => {
    try {
        const fromAddress = `${process.env.SMTP_FROM_NAME} <${process.env.EMAIL_FROM}>`;

        const params = {
            Source: fromAddress, // ✅ e.g. "Authentify <no-reply@authentify.primex360.com>"
            Destination: { ToAddresses: [email] },
            Message: {
                Subject: { Data: "Verify your email address" },
                Body: {
                    Html: {
                        Data: `
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
                    },
                },
            },
        };

        const command = new SendEmailCommand(params);
        await ses.send(command);
        console.log(`✅ Verification email sent to ${email}`);
    } catch (error) {
        console.error("❌ Failed to send verification email:", error.message);
    }
};




// import nodemailer from 'nodemailer';

// const {
//     SMTP_HOST,
//     SMTP_PORT,
//     SMTP_USER,
//     SMTP_PASS,
//     EMAIL_FROM
// } = process.env

// // const smtpPass = getSmtpPassword(AWS_SECRET_KEY, process.env.SMTP_REGION);

// export const sendVerificationEmail = async (email, name, verificationUrl) => {
//     try {
//         const transporter = nodemailer.createTransport({
//             host: SMTP_HOST,
//             port: Number(SMTP_PORT || 587),
//             secure:false,
//             requireTLS: true,
//             auth: {
//                 user: SMTP_USER,
//                 pass: SMTP_PASS
//             },
//             tsl: {
//                 rejectUnauthorized: false //this allows render's internal certs
//             }
//         });

//         const mailOptions = {
//             from: EMAIL_FROM,
//             to: email,
//             subject: "Verify your email address",
//             html: `
//                 <div style="font-family:Arial,sans-serif;padding:20px;line-height:1.6">
//                 <h2>Hello ${name},</h2>
//                 <p>Thank you for signing up on <b>Authentify</b>.</p>
//                 <p>Please verify your email by clicking the button below:</p>
//                 <a href="${verificationUrl}"
//                     style="display:inline-block;background:#2563eb;color:#fff;
//                     padding:10px 20px;border-radius:5px;text-decoration:none;">
//                     Verify Email
//                 </a>
//                 <p>If you did not create an account, you can ignore this message.</p>
//                 <p>Best regards,<br/>Authentify Team</p>
//                 </div>
//       `,
//         };

//         await transporter.sendMail(mailOptions);
//         console.log(`✅ Verification email sent to ${email}`)
//     } catch (error) {
//         console.error("❌ Failed to send verification email:", error.message)
//     }
// }
