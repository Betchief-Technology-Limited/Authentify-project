import crypto from 'crypto';


const TOKEN = process.env.TG_GATEWAY_TOKEN;

// Helper to verify signature per docs
export default function verifySignature(req) {
    const ts = req.headers['x-request-timestamp'];
    const sig = req.headers['x-request-signature'];
    if (!ts || !sig) return false;

    const rawBody = JSON.stringify(req.body);
    const dataCheck = `${ts}\n${rawBody}`;

    // secrectKey = SHA256(api_token)
    const secretKey = crypto.createHash('sha256').update(String(TOKEN)).digest();
    const hmac = crypto.createHmac('sha256', secretKey).update(dataCheck).digest('hex');

    // timingSafeCompare to avoid timing attacks
    const a = Buffer.from(hmac, 'hex');
    const b = Buffer.from(sig, 'hex');
    if (a.length !== b.length) return false;
    return crypto.timingSafeEqual(a, b)
}
