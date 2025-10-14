import axios from "axios";
import dotenv from 'dotenv';

dotenv.config();

export const sendSmsViaMobishastra = async (to, text) => {
    const url = 'http://mshastra.com/sendsms_api_json.aspx';

    const payLoad = [
        {
            user: process.env.MOBI_USER,
            pwd: process.env.MOBI_PASSWORD,
            sender: process.env.MOBI_SENDER,
            number: to, //this must be international format(+234...)
            msg: text,
            language: 'ENGLISH',
            showerror: 'C'
        }
    ];

    try {
        const resp = await axios.post(url, payLoad, {
            headers: { 'Content-Type': 'application/json' }
        });

        //Response is an array like:
        //[{ "msg_id":"945809410", "number":"+2348...", "str_response":"000" }]

        const data = resp.data[0];

        return {
            success: data.str_response === '000',
            messageId: data.msg_id,
            responseCode: data.str_response,
            raw: data
        }
    } catch (err) {
        throw new Error(`Mobishastra SMS error: ${err.message}`);
    }
}
