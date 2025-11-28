import Wallet from "../models/wallet.js";
import { getIO } from "../config/socket.js";
import Transaction from "../models/transaction.js";
import Admin from "../models/Admin.js";
import { sendMail } from "../utils/mailerServiceAdmin.js";
import { walletFundedTemplate, lowBalanceTemplate } from "../utils/serviceAdminEmailTemplate.js";
import { v4 as uuidv4 } from 'uuid';

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
const MIN_API_COST = parseFloat(process.env.MIN_API_COST || "10");
const LOW_BALANCE_MULTIPLIER = parseInt(process.env.LOW_BALANCE_MULTIPLIER);

// interpretation: threshold = MIN_API_COST * LOW_BALANCE_MULTIPLIER
// default 2 * 500 = 1000 Naira threshold
const LOW_BALANCE_THRESHOLD = MIN_API_COST * LOW_BALANCE_MULTIPLIER;

export const checkBalance = async (adminId, cost) => {
    const wallet = await ensureWallet(adminId);

    if (typeof cost !== 'number' || isNaN(cost)) {
        throw new Error('Invalid cost parameter passed to checkBalance()');
    }
    return wallet.balance >= cost
}


/**
 * INTERNAL: Check if balance is low, send email + emit socket event
 * Called after deduct()
 */
const handleLowBalanceCheck = async (wallet) => {
    if (wallet.balance <= LOW_BALANCE_THRESHOLD) {

        const admin = await Admin.findById(wallet.admin);
        if (!admin || !admin.email) return;

        // Build template
        const { subject, html, text } = lowBalanceTemplate(wallet.balance, LOW_BALANCE_THRESHOLD);

        // Send email
        try {
            await sendMail({
                to: admin.email,
                subject,
                html,
                text
            });
            console.log("📩 Low balance email sent to:", admin.email);
        } catch (err) {
            console.log("❌ Failed to send low-balance email:", err.message);
        }

        // Emit low balance socket event for frontend modal
        try {
            getIO().emit("low_balance_warning", {
                admin: wallet.admin.toString(),
                balance: wallet.balance,
                threshold: LOW_BALANCE_THRESHOLD,
                timestamp: new Date()
            });
        } catch (err) {
            console.log("Socket error (low_balance_warning):", err.message);
        }
    }
};


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


    // 🔥 NEW: Check for low balance
    await handleLowBalanceCheck(wallet);

    return wallet;
}

// credit wallet (for top-ups)
export const credit = async (adminId, amount, description = 'Wallet top-up') => {
    const wallet = await ensureWallet(adminId);

    wallet.balance += amount;
    wallet.history.push({ type: 'credit', amount, description });
    await wallet.save();

    // 🔥 NEW: Send funded email receipt
    try {
        const admin = await Admin.findById(adminId);
        if (admin?.email) {
            const { subject, html, text } = walletFundedTemplate({amount, balance:wallet.balance});
            await sendMail({ to: admin.email, subject, html, text });
            console.log("📩 Wallet funded email sent to:", admin.email);
        }
    } catch (err) {
        console.log("❌ Failed to send funding email:", err.message);
    }

    // Emit wallet update
    try {
        getIO().emit("wallet_update", {
            admin: adminId,
            balance: wallet.balance,
            change: +amount,
            description,
            timestamp: new Date(),
        });
    } catch (err) {
        console.log("Socket error (wallet_update):", err.message);
    }


    return wallet;
}