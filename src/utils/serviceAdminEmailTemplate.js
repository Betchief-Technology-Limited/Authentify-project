
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
