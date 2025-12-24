import crypto from 'crypto';
import bcrypt from 'bcrypt';

export const generateApiKeys = async (mode = 'test') => {

    const publicKey = `pk_${mode}_${crypto.randomBytes(16).toString("hex")}-A`;
    const secret = `sk_${mode}_${crypto.randomBytes(16).toString("hex") }-A`

    const secretHash = await bcrypt.hash(secret, 12)

    return { publicKey, secret, secretHash }
}