import Wallet from "../models/wallet.js";
import { getIO } from "../config/socket.js";

/**
 * Auto-create wallet if missing 
 */

const ensureWallet = async (adminId) => {
    let wallet = await Wallet.findOne({ admin: adminId });
    if (!wallet) {
        wallet = await Wallet.create({
            admin: adminId,
            balance: 0,
            history: []
        })
    }

    return wallet;
}

// check if wallet has enough balance before making the API call
export const checkBalance = async (adminId, cost) => {
    const wallet = await ensureWallet(adminId);

    if (typeof cost !== 'number' || isNaN(cost)) {
        throw new Error('Invalid cost parameter passed to checkBalance()');
    }
    return wallet.balance >= cost
}

// Deduct from wallet and record history
export const deduct = async (adminId, cost, description = 'Service charge') => {
    const wallet = await ensureWallet(adminId)

    if (typeof cost !== 'number' || isNaN(cost)) {
        throw new Error('Invalid cost parameter passed to deduct()');
    }

    if (wallet.balance < cost) throw new Error('Insufficient wallet balance');

    wallet.balance -= cost;
    wallet.history.push({ type: 'debit', amount: cost, description });
    await wallet.save();

    // 📊 Emit wallet update
    try {
        getIO().emit("wallet_update", {
            admin: adminId,
            balance: wallet.balance,
            change: -cost,
            description,
            timestamp: new Date(),
        });
    } catch (err) {
        console.log("Socket not ready, continuing...", err.message);
    }

    return wallet;
}

// credit wallet (for top-ups)
export const credit = async (adminId, amount, description = 'Wallet top-up') => {
    const wallet = await ensureWallet(adminId);

    wallet.balance += amount;
    wallet.history.push({ type: 'credit', amount, description });
    await wallet.save();

    return wallet;
}