import axios from 'axios';

const BASE = process.env.TG_GATEWAY_BASE || 'https://gatewayapi.telegram.org';
const TOKEN = process.env.TG_GATEWAY_TOKEN;

if (!TOKEN) {
    console.warn('TG_GATEWAY_TOKEN not found.')
}

const headers = () => ({
    Authorization: `Bearer ${TOKEN}`,
    "Content-Type": "application/json"
});

// checkSendAbility
export const checkSendAbility = async (phone) => {
    try {
        const url = `${BASE}/checkSendAbility`;
        const body = { phone_number: phone };

        const resp = await axios.post(url, body, { headers: headers() });

        console.log('DEBUG TELEGRAM CHECK SEND RESPONSE:', resp.data);

        return resp.data; // This contains result.request_id
    } catch (err) {
        console.error('checkSendAbility error:', err.response?.data || err.message);
        // surface useful message to caller
        throw new Error(err.response?.data?.error?.message || err.response?.data || 'Failed to call checkSendAbility');
    }
}

// sendVerificationMessage
export const sendVerificationMessage = async (phone, code, requestId, callbackUrl, ttl = 300, payload = {}) => {
    try {
        const url = `${BASE}/sendVerificationMessage`;
        const body = {
            phone_number: phone,
            code,
            ttl,
            request_id: requestId,
            callback_url: callbackUrl,
            payload
        };
        const resp = await axios.post(url, body, { headers: headers() });
        return resp.data;
    } catch (err) {
        console.error('sendVerificationMessage error:', err.response?.data || err.message);
        throw new Error(err.response?.data?.error?.message || err.response?.data || 'Failed to call sendVerificationMessage');
    }
};