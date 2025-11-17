export const verifiedTemplate = (org) => {
    const name = org?.registeredName || "there";
    // const cp = org?.contactPerson?.fullName || "there";
    return {
        subject: "Your Organization has been verified ✅",
        html: `
        <div style="font-family:Arial,sans-serif;line-height:1.6">
                <h2>Hi ${name},</h2>
                <p>Great news! Your organization form has been <strong style="color:#16a34a">verified</strong> by Authentify Service Provider.</p>
                <p>You can now subscribe to and use our API services from your dashboard.</p>
                <p style="margin-top:16px;color:#64748b">If this wasn’t you, please contact support immediately.</p>
                <hr/>
                <p style="font-size:12px;color:#94a3b8">Authentify API Service Provider</p>
        </div>
        `,
        text: `Hi ${name}, your organization has been verified by Authentify API Service Provider. You can now subscribe to and use our API services.`
    }
}

export const rejectedTemplate = (org, feedback) => {
    const name = org?.registeredName || "there";
    // const cp = org?.contactPerson?.fullName || "there";
    return {
        subject: "Organization Verification Result ❌",
        html: `
      <div style="font-family:Arial,sans-serif;line-height:1.6">
        <h2>Hi ${name},</h2>
        <p>We reviewed your organization's form submission and unfortunately it was <strong style="color:#dc2626">rejected</strong> for now.</p>
        ${feedback ? `<p><strong>Reason:</strong> ${feedback}</p>` : ""}
        <p>Please update your submission in the dashboard and resubmit.</p>
        <hr/>
        <p style="font-size:12px;color:#94a3b8">Authentify API Service Provider</p>
      </div>
    `,
        text: `Hi ${name}, organization's form submission was rejected. ${feedback ? "Reason: " + feedback : ""} Please update and resubmit.`,
    };
};
