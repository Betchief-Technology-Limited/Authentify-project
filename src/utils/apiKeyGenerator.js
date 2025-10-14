import { v4 as uuidv4 } from 'uuid';

export const generateApiKeys = (mode = 'test') => {
    return {
        publicKey: `pk_${mode}_${uuidv4()}-A`,
        secretKey: `sk_${mode}_${uuidv4()}-A`
    };
}