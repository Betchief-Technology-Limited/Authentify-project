import Wallet from "../models/wallet.js";

// GET wallet balance and history
export const getWallet = async (req, res) => {
    try {
        const wallet = await Wallet.findOne({ admin: req.admin._id });
        if (!wallet) return res.status(404).json({ message: "Wallet not found" });

        res.status(200).json({
            balance: wallet.balance,
            history: wallet.history
        });
    } catch (err) {
        res.status(500).json({ message: "Failed to fetch wallet", error: err.message });
    }
};

// POST recharge wallet
export const rechargeWallet = async (req, res) => {
    try {
        const amount  = Number(req.body.amount);
        if (isNaN(amount) || amount <= 0) return res.status(400).json({ message: "Invalid amount" });

        let wallet = await Wallet.findOne({ admin: req.admin._id });
        if (!wallet) {
            wallet = await Wallet.create({ admin: req.admin._id, balance: 0, history: [] });
        }

        wallet.balance += Number(amount);
        wallet.history.push({ type: "credit", amount, description: "Wallet top-up" });
        await wallet.save();

        res.status(200).json({
            balance: wallet.balance,
            history: wallet.history
        });
    } catch (err) {
        res.status(500).json({ message: "Failed to recharge wallet", error: err.message });
    }
};
