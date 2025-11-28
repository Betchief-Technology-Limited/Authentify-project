
export const verifiedTemplate = (org) => {
    const name = org?.registeredName || "there";
    // const cp = org?.contactPerson?.fullName || "there";
    return {
        subject: "Your Organization has been verified ✅",
        html: `
        <div style="font-family:Arial,sans-serif;line-height:1.6">
                <h2>Dear ${name},</h2>
                <p>Great news! <strong>${name}</strong> has been <strong style="color:#16a34a">verified</strong> by Authentify Service Provider.</p>
                <p>You can now subscribe to and use our API services from your dashboard.</p>
                <p style="margin-top:16px;color:#64748b">If this wasn’t you, please contact support immediately.</p>
                <hr/>
                <p style="font-size:12px;color:#94a3b8">Authentify API Service Provider</p>
        </div>
        `,
        text: `Hi ${name}, ${name} has been verified by Authentify API Service Provider. You can now subscribe to and use our API services.`
    }
}

export const rejectedTemplate = (org, feedback) => {
    const name = org?.registeredName || "there";
    // const cp = org?.contactPerson?.fullName || "there";
    return {
        subject: "Organization Verification Result ❌",
        html: `
      <div style="font-family:Arial,sans-serif;line-height:1.6">
        <h2>Dear ${name},</h2>
        <p>We reviewed <strong>${name}</strong>'s submission and unfortunately it was <strong style="color:#dc2626">rejected</strong> for now.</p>
        ${feedback ? `<p><strong>Reason:</strong> ${feedback}</p>` : ""}
        <p>Please update your submission in the dashboard and resubmit.</p>
        <hr/>
        <p style="font-size:12px;color:#94a3b8">Authentify API Service Provider</p>
      </div>
    `,
        text: `Hi ${name}, ${name}'s submission was rejected. ${feedback ? "Reason: " + feedback : ""} Please update and resubmit.`,
    };
};

// RESPOND TO HELP REQUEST
export const helpReplyTemplate = (help, reply) => ({
    subject: `Re: ${help.subject}`,
    html: `
            <p>Hello ${help.firstName}</p>
            <p>Your help request has been reviewed. Below is our response:</p>
            <p><strong>${reply}</strong></p>
            <p>Thank you,<br/>Support Team</p>
          `,
    text: `Your help request: ${help.subject}\n\nResponse:\n${reply}`
})

// PREPARE OTP EMAIL CONTENTS
// export const sendEmailOtpTemplate = (code) => {
//     const ttlMinutes = Math.floor(process.env.OTP_TTL_SECONDS / 60)
//     return {
//         subject: "Your Authentify verification code",
//         html: `
//     <div style="font-family:Arial,Helvetica,sans-serif;line-height:1.6;color:#111">
//       <h3>Your verification code</h3>
//       <p>Your Authentify verification code is:</p>
//       <p style="font-size:22px;font-weight:700;letter-spacing:4px">${code}</p>
//       <p>This code expires in ${ttlMinutes} minute(s).</p>
//       <hr/>
//       <p style="font-size:12px;color:#6b7280">If you did not request this code, ignore this message.</p>
//     </div>
//   `,
//         text: `Your Authentify verification code is ${code}. It expires in ${ttlMinutes} minute(s).`
//     }
// }


export const sendEmailOtpTemplate = (code) => {
    const ttlSeconds = parseInt(process.env.OTP_TTL_SECONDS || "300", 10);
    const ttlMinutes = Math.floor(ttlSeconds / 60);

    return {
        subject: "Your Authentify verification code",
        html: `
            <div style="font-family:Arial,Helvetica,sans-serif;line-height:1.6;color:#111">
                <h3>Your verification code</h3>
                <p>Your Authentify verification code is:</p>
                <p style="font-size:22px;font-weight:700;letter-spacing:4px;color:#16a34a">${code}</p>
                <p>This code expires in ${ttlMinutes} minute(s).</p>
                <hr/>
                <p style="font-size:12px;color:#6b7280">
                    If you did not request this code, please ignore this message.
                </p>
            </div>
        `,
        text: `Your Authentify verification code is ${code}. It expires in ${ttlMinutes} minute(s).`
    };
};


// WALLET FUNDED TEMPLATE
export const walletFundedTemplate = ({ amount, balance }) => {
    return {
        subject: "Your Authentify wallet has been funded ✅",
        html: `
            <div style="font-family:Arial,Helvetica,sans-serif;line-height:1.6;color:#111">
                <h2>Wallet Funded Successfully 🎉</h2>
                <p><strong>Amount added:</strong> ₦${Number(amount).toLocaleString()}</p>
                <p><strong>New balance:</strong> ₦${Number(balance).toLocaleString()}</p>
                <hr/>
                <p style="font-size:12px;color:#6b7280">If you did not perform this transaction, contact support immediately.</p>
            </div>
            `,
        text: `Your wallet was funded with ₦${amount}. New balance: ₦${balance}.`
    }
}

// LOWBALANCETEMPLATE
export const lowBalanceTemplate = ({ balance, callsLeft }) => {
    return {
        subject: "Low wallet balance alert ⚠️",
        html: `
      <div style="font-family:Arial,Helvetica,sans-serif;line-height:1.6;color:#111">
        <h3>Low Wallet Balance Warning</h3>
        <p>Your wallet balance is low: <strong>₦${Number(balance).toLocaleString()}</strong></p>
        <p>Estimated remaining API calls (min-cost): <strong>${callsLeft}</strong></p>
        <p>Please top up to avoid service disruption.</p>
        <hr/>
        <p style="font-size:12px;color:#6b7280">You can top-up from your dashboard.</p>
      </div>
    `,
        text: `Low wallet balance: ₦${balance}. Estimated remaining calls: ${callsLeft}. Please top up.`
    };
};