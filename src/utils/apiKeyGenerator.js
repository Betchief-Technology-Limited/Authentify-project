import crypto from "crypto";
import bcrypt from "bcrypt";

// This is for generating public key
export const generatePublicKey = (mode = "test") => {
    return `pk_${mode}_${crypto.randomBytes(16).toString("hex")}-Authentify`
}

// This is to generate secret key
export const generateSecretKey = async (mode ="test") => {
    const secretKey = `sk_${mode}_${crypto.randomBytes(24).toString("hex")}-Authentify`
    const secretHash = await bcrypt.hash(secretKey, 12);
    return { secretKey, secretHash }
}




// import { v4 as uuidv4 } from "uuid"

// export const generateApiKeys = async (mode = 'test') => {
//         return {
//                 publicKey: `pk_${mode}_${uuidv4()}-Authentify`,
//                 secretKey: `sk_${mode}_${uuidv4()}-Authentify`
//             }

//         }


