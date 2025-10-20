import { sendEmail, createTemplate, getTemplate } from "../services/emailService";
import EmailTemplate from "../models/emailTemplate.js";

// export const sendEmailController = async (req, res) => {
//     try {
//         const { to, subject, body, templateName, templateData } = req.body;
//         const admin = req.admin;

//         // If templateName supplied, fetch and render template
//         let templateId = null;
//         let finalSubject = subject;
//         let finalBody = body;

//         if (templateName) {
//             const tpl = await getTemplate({ admin, name: templateName });
//         }
//     } catch (err) {

//     }
// }

// Simple template renderer: replaces {{key}} with templateData.key

const renderTemplate = (body, templateData = {}) => {
    let out = body;
    for (const key of Object.keys(templateData || {})) {
        const re = new RegExp(`{{\\s*${key}\\s*}}`, 'g');
        out = out.replace(re, String(templateData[key]));
    }
    return out;
}

export const sendEmailController = async (req, res) => {
    try {
        const { to, subject, body, templateName, templateData, from } = req.body;
        const admin = req.admin;

        if (!to) return res.status(400).json({ success: false, message: 'Missing "to" email' });

        let finalSubject = subject || '';
        let finalBody = body || '';

        // if templateName supplied, fetch template and render
        let templateId = null;
        if (templateName) {
            const tpl = await getTemplate({ admin, name: templateName });
            if (!tpl) return res.status(404).json({ success: false, message: 'Template not found' });

            templateId = tpl._id;
            finalSubject = tpl.subject;
            finalBody = renderTemplate(tpl.body, templateData || {});
        } else {
            // if template not used but templateData provided, interpolate body/subject
            if (templateData && Object.keys(templateData).length) {
                finalSubject = renderTemplate(finalSubject, templateData);
                finalBody = renderTemplate(finalBody, templateData)
            }
        }
        // Basic validation
        if (!finalSubject & !finalBody) {
            return res.status(400).json({ success: false, message: 'Subject or body required' });
        }

        // `from` must be provided by client (e.g 'GTBank <promo@gtbank.com') OR default to EMAIL_FROM

        const fromHeader = from || process.env.EMAIL_FROM;
        if (!fromHeader) {
            return res.status(400).json({ success: false, message: 'From header missing. Provide "from" in request or set EMAIL_FROM env.' })
        }

        // Call service
        const { emailDoc, transaction, sendResp } = await sendEmail({
            admin,
            from: fromHeader,
            to,
            subject: finalSubject,
            body: finalBody,
            templateId
        });

        if (sendResp.ok) {
            return res.status(200).json({
                success: true,
                message: 'Email queued/sent',
                emailId: emailDoc._id,
                tx_ref: transaction.tx_ref,
                providerResponse: sendResp
            });
        } else {
            return res.status(500).json({
                success: false,
                message: 'Email failed to send',
                providerResponse: sendResp
            })
        }
    } catch (err) {
        console.error('sendEmailController error:', err);
        return res.status(500).json({ success: false, message: 'Server error', error: err.message || String(err) });
    }
}