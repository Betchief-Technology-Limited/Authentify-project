// utils/sendGridProvider.js
import sgMail from '@sendgrid/mail';

/**
 * Sends an email using SendGrid
 * @param {Object} params
 * @param {string} params.from - Sender email address
 * @param {string|string[]} params.to - Recipient email(s)
 * @param {string} params.subject - Email subject
 * @param {string} params.body - HTML body content
 * @returns {Promise<{ok: boolean, raw?: any, error?: string}>}
 */
export const sendViaSendGrid = async ({ from, to, subject, body }) => {
  const apiKey = process.env.SENDGRID_API_KEY;
  const defaultFrom = process.env.SENDGRID_FROM || process.env.EMAIL_FROM;

  if (!apiKey) {
    return { ok: false, error: 'SendGrid API key not configured' };
  }

  sgMail.setApiKey(apiKey);

  try {
    const msg = {
      to,
      from: from || defaultFrom,
      subject,
      html: body,
      trackingSettings: {
        clickTracking: { enable: false },
        openTracking: { enable: false },
      },
    };

    const [response] = await sgMail.send(msg);

    const statusCode = response?.statusCode || 202;
    const accepted = statusCode === 202;

    return {
      ok: accepted,
      raw: {
        statusCode,
        headers: response.headers,
        message: 'SendGrid response received',
      },
    };
  } catch (err) {
    console.error('SendGrid send error:', err.response?.body || err.message);
    return {
      ok: false,
      error:
        err.response?.body?.errors?.[0]?.message ||
        err.message ||
        String(err),
    };
  }
};
