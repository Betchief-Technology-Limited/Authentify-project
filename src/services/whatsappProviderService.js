import axios from 'axios';
import dotenv from 'dotenv'

dotenv.config();

const WHATSAPP_ACCESS_TOKEN = process.env.WHATSAPP_ACCESS_TOKEN;
const WHATSAPP_PHONE_NUMBER_ID = process.env.WHATSAPP_PHONE_NUMBER_ID;

export const sendWhatsappMessage = async (to, message) => {
    try {
        const resp = await axios.post(
            `https://graph.facebook.com/v20.0${WHATSAPP_PHONE_NUMBER_ID}/messages`,
            {
                messaging_product: "whatsapp",
                to: to, // must be full international format, e.g "+2348130841061"
                type: "text",
                text: { body: message }
            },
            {
                headers: {
                    Authorization: `Bearer ${WHATSAPP_ACCESS_TOKEN}`,
                    "Content-Type": "application/json"
                }
            }
        );

        return {
            success: true,
            messageId: resp.data.messages[0].id,
            raw: resp.data
        }
    } catch (err) {
        console.error('Whatsapp send error:', err.response?.data || err.message);
        return {
            success: false,
            error: err.response?.data || err.message,
            raw: err.response?.data || err
        };
    }
}