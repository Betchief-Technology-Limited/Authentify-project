import Wallet from "../models/wallet.js";
import Admin from "../models/Admin.js";
// import { generateApiKeys } from "../utils/apiKeyGenerator.js";
import { generatePublicKey, generateSecretKey } from "../utils/apiKeyGenerator.js";
import mongoose from "mongoose";
import Transaction from "../models/transaction.js";
import { credit } from "../services/walletService.js";

// GET wallet balance and history
export const getWallet = async (req, res) => {
    try {
        const wallet = await Wallet.findOne({ admin: req.admin._id });
        if (!wallet) return res.status(404).json({ message: "Wallet not found" });

        res.status(200).json({
            success: true,
            balance: wallet.balance,
            history: wallet.history
        });

        console.log("Admin ID from token:", req.admin?._id);

    } catch (err) {
        res.status(500).json({
            success: false,
            message: "Failed to fetch wallet",
            error: err.message
        });
    }
};

// POST recharge wallet
// export const rechargeWallet = async (req, res) => {
//     try {
//         const amount = Number(req.body.amount);
//         if (isNaN(amount) || amount <= 0) return res.status(400).json({ message: "Invalid amount" });

//         // Ensure wallet exists
//         let wallet = await Wallet.findOne({ admin: req.admin._id });
//         if (!wallet) {
//             wallet = await Wallet.create({ admin: req.admin._id, balance: 0, history: [] });
//         }

//         // Credit wallet balance
//         wallet.balance += Number(amount);
//         wallet.history.push({
//             type: "credit",
//             amount,
//             description: "Wallet top-up"
//         });
//         await wallet.save();

//         // Ensure LIVE API keys exist for the admin
//         const admin = await Admin.findById(req.admin._id);
//         if (!admin) {
//             return res.status(404).json({ message: "Admin not found" });
//         }

//         if (!admin.apiKeys?.live.publicKey || !admin.apiKeys?.live.secretKey) {
//             const liveKeys = generateApiKeys("live");
//             admin.apiKeys.live = liveKeys;
//             await admin.save();
//             console.log(`✅ Live API keys generated for admin: ${req.admin._id}`)
//         }

//         res.status(200).json({
//             success: true,
//             message: "Wallet recharged successfully and live keys generated",
//             newBalance: wallet.balance,
//             apiKeys: admin.apiKeys.live,
//             history: wallet.history
//         });

//         console.log("Admin ID from token:", req.admin?._id);

//     } catch (err) {
//         res.status(500).json({ message: "Failed to recharge wallet", error: err.message });
//     }
// };

/**
 * POST recharge wallet
 * Now uses walletService.credit() to:
 *  - update wallet
 *  - push history
 *  - auto-send funded email
 *  - emit socket event
 */
export const rechargeWallet = async (req, res) => {
    try {
        const amount = Number(req.body.amount);
        if (isNaN(amount) || amount <= 0) {
            return res.status(400).json({ message: "Invalid amount" });
        }

        // 1️⃣ Credit wallet (walletService handles EVERYTHING)
        const wallet = await credit(req.admin._id, amount, "Wallet top-up");

        // 2️⃣ Ensure admin exists
        const admin = await Admin.findById(req.admin._id);
        if (!admin) {
            return res.status(404).json({ message: "Admin not found" });
        }

        let liveSecretToReturn = null;

        // 3️⃣if LIVE keys nott yet created => create once
        if (!admin.apiKeys?.live?.publicKey) {
            const publicKey = generatePublicKey("live");
            const { secretKey, secretHash } = await generateSecretKey("live");

            admin.apiKeys.live = {
                publicKey,
                secretHash,
                createdAt: new Date(),
                lastRotatedAt: new Date()
            };

            await admin.save();

            // Return secret ONCE
            liveSecretToReturn = secretKey
        }

        return res.status(200).json({
            success: true,
            message: "Wallet recharged successfully",
            balance: wallet.balance,
            history: wallet.history,
            apiKeys: admin.apiKeys.live.publicKey
                ? {
                    publicKey: admin.apiKeys.live.publicKey,
                    // secret only returned first time
                    ...(liveSecretToReturn && { secretKey: liveSecretToReturn })
                }
                : null
        });

        // // 3️⃣ Auto-generate LIVE API keys if missing
        // if (!admin.apiKeys?.live?.publicKey || !admin.apiKeys?.live?.secretKey) {
        //     admin.apiKeys.live = generateApiKeys("live");
        //     await admin.save();
        // }

        // res.status(200).json({
        //     success: true,
        //     message: "Wallet recharged successfully",
        //     balance: wallet.balance,
        //     apiKeys: admin.apiKeys.live,
        //     history: wallet.history
        // });

    } catch (err) {
        res.status(500).json({
            success: false,
            message: "Failed to recharge wallet",
            error: err.message
        });
    }
};

// GET wallet dashboard summary
export const getWalletSummary = async (req, res) => {
    try {
        const adminId = req.admin._id;

        // 1️⃣ Load wallet
        const wallet = await Wallet.findOne({ admin: adminId });
        if (!wallet) {
            return res.status(404).json({ success: false, message: "Wallet not found" });
        }

        // 2️⃣ Total credited & debited from wallet history
        let totalCredited = 0;
        let totalDebitedFromHistory = 0;

        wallet.history.forEach(tx => {
            if (tx.type === "credit") totalCredited += tx.amount;
            if (tx.type === "debit") totalDebitedFromHistory += tx.amount;
        });

        // 3️⃣ Debits from Transaction Model (API usage)
        const apiDebits = await Transaction.aggregate([
            {
                $match: {
                    admin: new mongoose.Types.ObjectId(adminId),
                    status: "successful",
                    provider: 'paystack',
                    serviceType: { $ne: "wallet_topup" } // Exclude funding transactions
                }
            },
            {
                $group: {
                    _id: null,
                    total: { $sum: "$amount" }
                }
            }
        ]);

        const totalDebitedFromAPI = apiDebits[0]?.total || 0;
        const totalDebited = totalDebitedFromHistory + totalDebitedFromAPI;

        // 4️⃣ Construct Jan–Dec structure
        const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
        const year = new Date().getFullYear();

        const months = Array.from({ length: 12 }).map((_, i) => ({
            month: `${year}-${String(i + 1).padStart(2, "0")}`,
            label: monthNames[i],
            credited: 0,
            debited: 0
        }));

        // 5️⃣ Aggregate wallet history monthly
        const walletAgg = await Wallet.aggregate([
            { $match: { admin: new mongoose.Types.ObjectId(adminId) } },
            { $unwind: "$history" },
            {
                $group: {
                    _id: {
                        month: { $dateToString: { format: "%Y-%m", date: "$history.createdAt" } },
                        type: "$history.type"
                    },
                    total: { $sum: "$history.amount" }
                }
            }
        ]);

        // 6️⃣ Aggregate API debits monthly
        const apiAgg = await Transaction.aggregate([
            {
                $match: {
                    admin: new mongoose.Types.ObjectId(adminId),
                    status: "successful",
                    provider: 'paysatck',
                    serviceType: { $ne: "wallet_topup" }
                }
            },
            {
                $group: {
                    _id: { month: { $dateToString: { format: "%Y-%m", date: "$createdAt" } } },
                    totalDebited: { $sum: "$amount" }
                }
            }
        ]);

        // 7️⃣ Merge into months array
        months.forEach(m => {
            const walletCredit = walletAgg.find(x => x._id.month === m.month && x._id.type === "credit");
            const walletDebit = walletAgg.find(x => x._id.month === m.month && x._id.type === "debit");
            const apiDebit = apiAgg.find(x => x._id.month === m.month);

            m.credited = walletCredit?.total || 0;
            m.debited = (walletDebit?.total || 0) + (apiDebit?.totalDebited || 0);
        });

        // 8️⃣ Send response
        res.json({
            success: true,
            balance: wallet.balance,
            totalCredited,
            totalDebited,
            monthly: months
        });

    } catch (err) {
        console.error(err);
        res.status(500).json({
            success: false,
            message: "Failed to load wallet summary",
            error: err.message
        });
    }
};








// export const getWalletSummary = async (req, res) => {
//     try {
//         const adminId = req.admin._id;

//         // 1️⃣ Wallet load
//         const wallet = await Wallet.findOne({ admin: adminId });
//         if (!wallet) {
//             return res.status(404).json({ success: false, message: "Wallet not found" });
//         }

//         // 2️⃣ Total credited & debited from wallet history
//         let totalCredited = 0;
//         let totalDebitedFromHistory = 0;

//         wallet.history.forEach(tx => {
//             if (tx.type === "credit") totalCredited += tx.amount;
//             if (tx.type === "debit") totalDebitedFromHistory += tx.amount;
//         });

//         // 🔥 3️⃣ Debits from Transaction Model (API usage)
//         const apiDebits = await Transaction.aggregate([
//             {
//                 $match: {
//                     admin: new mongoose.Types.ObjectId(adminId),
//                     status: "successful",
//                     provider: { $ne: "flutterwave" } // flutterwave = CREDIT
//                 }
//             },
//             {
//                 $group: {
//                     _id: null,
//                     total: { $sum: "$amount" }
//                 }
//             }
//         ]);

//         const totalDebitedFromAPI = apiDebits[0]?.total || 0;
//         const totalDebited = totalDebitedFromHistory + totalDebitedFromAPI;

//         // 🔥 4️⃣ Build months array Jan–Dec
//         const months = Array.from({ length: 12 }).map((_, i) => {
//             const month = (i + 1).toString().padStart(2, "0");
//             const year = new Date().getFullYear();
//             return {
//                 month: `${year}-${month}`,
//                 credited: 0,
//                 debited: 0
//             };
//         });

//         // Adding months to the X-axis
//         const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

//         months.forEach((m, i) => {
//             m.label = monthNames[i];   // 👈 Add human readable label
//         });

//         // 5️⃣ Aggregate from wallet history (Monthly credit & debit)
//         const walletAgg = await Wallet.aggregate([
//             { $match: { admin: new mongoose.Types.ObjectId(adminId) } },
//             { $unwind: "$history" },
//             {
//                 $group: {
//                     _id: {
//                         month: { $dateToString: { format: "%Y-%m", date: "$history.createdAt" } },
//                         type: "$history.type"
//                     },
//                     total: { $sum: "$history.amount" }
//                 }
//             }
//         ]);

//         // 6️⃣ Aggregate API debits monthly (transaction model)
//         const apiAgg = await Transaction.aggregate([
//             {
//                 $match: {
//                     admin: new mongoose.Types.ObjectId(adminId),
//                     status: "successful",
//                     provider: { $ne: "flutterwave" }
//                 }
//             },
//             {
//                 $group: {
//                     _id: { month: { $dateToString: { format: "%Y-%m", date: "$createdAt" } } },
//                     totalDebited: { $sum: "$amount" }
//                 }
//             }
//         ]);

//         // 7️⃣ Merge into months array
//         months.forEach(m => {
//             const walletCredit = walletAgg.find(x => x._id.month === m.month && x._id.type === "credit");
//             const walletDebit = walletAgg.find(x => x._id.month === m.month && x._id.type === "debit");
//             const apiDebit = apiAgg.find(x => x._id.month === m.month);

//             m.credited = walletCredit?.total || 0;
//             m.debited = (walletDebit?.total || 0) + (apiDebit?.totalDebited || 0);
//         });

//         // 8️⃣ Return dashboard summary
//         res.json({
//             success: true,
//             balance: wallet.balance,
//             totalCredited,
//             totalDebited,
//             monthly: months
//         });

//     } catch (err) {
//         console.error(err);
//         res.status(500).json({
//             success: false,
//             message: "Failed to load wallet summary",
//             error: err.message
//         });
//     }
// };

// export const getWalletSummary = async (req, res) => {
//     try {
//         const adminId = req.admin._id;

//         // 1️⃣ Load wallet
//         const wallet = await Wallet.findOne({ admin: adminId });
//         if (!wallet) {
//             return res.status(404).json({
//                 success: false,
//                 message: "Wallet not found"
//             })
//         }

//         // 2️⃣ Compute total credited & debited from wallet history
//         let totalCredited = 0;
//         let totalDebited = 0;

//         wallet.history.forEach(tx => {
//             if (tx.type === "credit") totalCredited += tx.amount;
//             if (tx.type === "debit") totalDebited += tx.amount;
//         });

//         // 3️⃣ Monthly aggregation (Jan-Dec)
//         const monthly = await Wallet.aggregate([
//             { $match: { admin: new mongoose.Types.ObjectId(adminId) } },
//             { $unwind: "$history" },
//             {
//                 $group: {
//                     _id: {
//                         month: { $dateToString: { format: "%Y-%m", date: "$history.createdAt" } },
//                         type: "history.type"
//                     },
//                     total: { $sum: "$history.amount" }
//                 }
//             },
//             {
//                 $group: {
//                     _id: "$_id.month",
//                     credited: {
//                         $sum: {
//                             $cond: [{ $eq: ["$_id.type", "credit"] }, "$total", 0]
//                         }
//                     },
//                     debited: {
//                         $sum: {
//                             $cond: [{ $eq: ["$_id.type", "debit"] }, "$total", 0]
//                         }
//                     }
//                 }
//             },
//             { $sort: { _id: 1 } },
//             {
//                 $project: {
//                     month: "$_id",
//                     credited: 1,
//                     debited: 1,
//                     _id: 0
//                 }
//             }
//         ]);

//         res.json({
//             success: true,
//             balance: wallet.balance,
//             totalCredited,
//             totalDebited,
//             monthly
//         })
//     } catch (err) {
//         console.error(err);
//         res.status(500).json({
//             success: false,
//             message: "Failed to load wallet summary",
//             error: err.message
//         });
//     }
// };
