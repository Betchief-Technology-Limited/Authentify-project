import Wallet from "../models/wallet.js";

const SMS_API_COST = parseFloat(process.env.SMS_API_COST || '10');

// check if wallet has enough balance before making the API call
export const checkBalance = async (adminId, cost = SMS_API_COST) => {
    const wallet = await Wallet.findOne({ admin: adminId });
    if(!wallet) throw new Error('Wallet not found');
    return wallet.balance >= cost
}

// Deduct from wallet and record history
export const deduct = async (adminId, cost = SMS_API_COST, description = 'SMS OTP sent') => {
    const wallet = await Wallet.findOne({ admin: adminId })
    if(!wallet) throw new Error('Wallet not found');
    if(wallet.balance < cost) throw new Error('Insufficient wallet balance');

    wallet.balance -= cost;
    wallet.history.push({ type: 'debit', amount: cost, description });
    await wallet.save();

    return wallet;
}

// credit wallet (for top-ups)
export const credit = async (adminId, amount, description = 'Wallet top-up') => {
     const wallet = await Wallet.findOne({ admin: adminId });
     if(!wallet) throw new Error('Wallet not found');

     wallet.balance += amount;
     wallet.history.push({ type: 'credit', amount, description });
     await wallet.save();

     return wallet;
}