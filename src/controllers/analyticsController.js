import Transaction from "../models/transaction.js";
import mongoose from "mongoose";

/**
 * GET /api/analytics/services/:serviceKey/summary
 * Returns totals for today/week/month for the given serviceKey (kyc, otp, email_service)
 */

export const serviceSummary = async (req, res) => {
    try {
        const adminId = req.admin._id;
        const serviceKey = req.params.serviceKey; // e.g 'kyc'
        const now = new Date();

        const startOfToday = new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()));

        const startOfWeeK = new Date(startOfToday);
        startOfWeeK.setUTCDate(startOfWeeK.getUTCDate() - ((startOfWeeK.getUTCDay() + 6) % 7));

        const startOfMonth = new Date(Date.UTC(now.getFullYear(), now.getMonth(), 1));

        const matchBase = {
            admin: new mongoose.Types.ObjectId(adminId),
            serviceType: serviceKey,
            status: 'successful'
        };

        const [todayCount, weekCount, monthCount] = await Promise.all([
            Transaction.countDocuments({ ...matchBase, createdAt: { $gte: startOfToday } }),
            Transaction.countDocuments({ ...matchBase, createdAt: { $gte: startOfWeeK } }),
            Transaction.countDocuments({ ...matchBase, createdAt: { $gte: startOfMonth } })
        ]);

        return res.json({
            success: true,
            totals: {
                today: todayCount,
                week: weekCount,
                month: monthCount
            }
        });
    } catch (err) {
        console.error("serviceSummary error:", err);
        return res.status(500).json({ success: false, message: err.message })
    }
}


/**
 * GET /api/analytics/services/:serviceKey/subservices?range=day|week|month
 * Returns counts grouped by subservice for the requested range (default: month)
 */


export const subserviceCounts = async (req, res) => {
    try {
        const adminId = req.admin._id;
        const serviceKey = req.params.serviceKey;
        // const range = (req.query.range || 'month').toLowerCase(); // 'day' | 'week' | 'month'
        // const now = new Date();

        // let start;

        // if (range === 'day') {
        //     start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        // } else if (range === 'week') {
        //     start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        //     start.setDate(start.getDate() - (start.getDay() || 7) + 1); //Monday
        // } else {
        //     start = new Date(now.getFullYear(), now.getMonth(), 1)
        // }

        const pipeline = [
            {
                $match: {
                    admin: new mongoose.Types.ObjectId(adminId),
                    serviceType: serviceKey,
                    status: 'successful'
                }
            },
            {
                $group: {
                    _id: "$subservice", // group by subservice field
                    calls: { $sum: 1 }
                }
            },
            { $sort: { calls: -1 } }
        ];

        const agg = await Transaction.aggregate(pipeline);

        // Normalize to ensure subservices with zero calls still appear if you have a canonical list
        return res.json({
            success: true,
            data: agg.map((result) => ({
                subservice: result._id || "unknown",
                calls: result.calls
            }))
        });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
}
