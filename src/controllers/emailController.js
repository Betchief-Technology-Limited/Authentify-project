import { sendEmail, getTemplate } from "../services/emailService.js";

/**
 * Simple template renderer: replaces {{key}} with templateData.key
 */
const renderTemplate = (body, templateData = {}) => {
    let out = body;
    for (const key of Object.keys(templateData || {})) {
        const re = new RegExp(`{{\\s*${key}\\s*}}`, "g");
        out = out.replace(re, String(templateData[key]));
    }
    return out;
};

/**
 * Controller for sending email via dynamic providers
 * Supported providers: smtp | sendgrid | mock
 */
export const sendEmailController = async (req, res) => {
    try {
        const { to, subject, body, templateName, templateData, from, provider } = req.body;
        const admin = req.admin;

        if (!to)
            return res
                .status(400)
                .json({ success: false, message: 'Missing "to" email address' });

        let finalSubject = subject || "";
        let finalBody = body || "";
        let templateId = null;

        // 1️⃣ If templateName supplied, fetch and render it
        if (templateName) {
            const tpl = await getTemplate({ admin, name: templateName });
            if (!tpl)
                return res
                    .status(404)
                    .json({ success: false, message: "Template not found" });

            templateId = tpl._id;
            finalSubject = tpl.subject || subject || "";
            finalBody = renderTemplate(tpl.body, templateData || {});
        } else if (templateData && Object.keys(templateData).length) {
            // Interpolate variables if provided
            finalSubject = renderTemplate(finalSubject, templateData);
            finalBody = renderTemplate(finalBody, templateData);
        }

        if (!finalSubject && !finalBody)
            return res
                .status(400)
                .json({ success: false, message: "Subject or body required" });

        const fromHeader = from || process.env.EMAIL_FROM;
        if (!fromHeader)
            return res.status(400).json({
                success: false,
                message:
                    'Missing "from" header — provide it in request or set EMAIL_FROM in .env',
            });

        // 2️⃣ Send email using service (explicit or auto provider)
        const { emailDoc, transaction, sendResp } = await sendEmail({
            admin,
            from: fromHeader,
            to,
            subject: finalSubject,
            body: finalBody,
            templateId,
            provider, // pass user-selected provider (smtp, sendgrid, or mock)
        });

        // 3️⃣ Response based on provider status
        if (sendResp.ok) {
            return res.status(200).json({
                success: true,
                message: "Email successfully sent",
                emailId: emailDoc._id,
                tx_ref: transaction.tx_ref,
                provider: emailDoc.provider,
                providerResponse: sendResp,
            });
        } else {
            return res.status(500).json({
                success: false,
                message: "Email failed to send",
                provider: emailDoc.provider,
                providerResponse: sendResp,
            });
        }
    } catch (err) {
        console.error("sendEmailController error:", err);
        return res.status(500).json({
            success: false,
            message: "Internal server error",
            error: err.message || String(err),
        });
    }
};
