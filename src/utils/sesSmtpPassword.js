import crypto from 'crypto';

/**
 * Generate SMTP password from AWS Secret Access Key
 * @param {string} secretKey - AWS Secret Access Key
 * @param {string} region - AWS SES region (e.g., "us-east-1")
 * @returns {string} SMTP password
 */

export default function getSmtpPassword(secretKey, region = "us-east-1") {
    const version = Buffer.from([0x04]);
    const message = 'SendRawEmail';

    const hmac = (key, msg) => crypto.createHmac('sha256', key).update(msg).digest();

    const kDate = hmac(Buffer.from('AWS4' + secretKey, 'utf-8'), '11111111');
    const kRegion = hmac(kDate, region);
    const kService = hmac(kRegion, 'ses');
    const kSigning = hmac(kService, 'aws4_request');
    const signature = crypto.createHmac('sha256', kSigning).update(message).digest();

    const smtpPassword = Buffer.concat([version, signature]).toString('base64');
    return smtpPassword;
}