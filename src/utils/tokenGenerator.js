import crypto from 'crypto'

export default function generateSecureToken(length = 64) {
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789"
    
    let token = "";
    const bytes = crypto.randomBytes(length);

    for(let i = 0; i < length; i++) {
        token +=chars[bytes[i] % chars.length]
    }

    return token;
}