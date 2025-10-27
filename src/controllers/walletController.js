import Wallet from "../models/wallet.js";
import Admin from "../models/Admin.js";
import { generateApiKeys } from "../utils/apiKeyGenerator.js";

// GET wallet balance and history
export const getWallet = async (req, res) => {
    try {
        const wallet = await Wallet.findOne({ admin: req.admin._id });
        if (!wallet) return res.status(404).json({ message: "Wallet not found" });

        res.status(200).json({
            balance: wallet.balance,
            history: wallet.history
        });

        console.log("Admin ID from token:", req.admin?._id);

    } catch (err) {
        res.status(500).json({ message: "Failed to fetch wallet", error: err.message });
    }
};

// POST recharge wallet
export const rechargeWallet = async (req, res) => {
    try {
        const amount = Number(req.body.amount);
        if (isNaN(amount) || amount <= 0) return res.status(400).json({ message: "Invalid amount" });

        // Ensure wallet exists
        let wallet = await Wallet.findOne({ admin: req.admin._id });
        if (!wallet) {
            wallet = await Wallet.create({ admin: req.admin._id, balance: 0, history: [] });
        }

        // Credit wallet balance
        wallet.balance += Number(amount);
        wallet.history.push({
            type: "credit",
            amount,
            description: "Wallet top-up"
        });
        await wallet.save();

        // Ensure LIVE API keys exist for the admin
        const admin = await Admin.findById(req.admin._id);
        if (!admin) {
            return res.status(404).json({ message: "Admin not found" });
        }

        if (!admin.apiKeys?.live.publicKey || !admin.apiKeys?.live.secretKey) {
            const liveKeys = generateApiKeys("live");
            admin.apiKeys.live = liveKeys;
            await admin.save();
            console.log(`✅ Live API keys generated for admin: ${req.admin._id}`)
        }

        res.status(200).json({
            success: true,
            message: "Wallet recharged successfully and live keys generated",
            newBalance: wallet.balance,
            apiKeys: admin.apiKeys.live,
            history: wallet.history
        });

        console.log("Admin ID from token:", req.admin?._id);

    } catch (err) {
        res.status(500).json({ message: "Failed to recharge wallet", error: err.message });
    }
};
