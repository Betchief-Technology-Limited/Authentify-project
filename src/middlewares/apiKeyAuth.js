// middleware/apiKeyAuth.js
import Admin from "../models/Admin.js";
import Subscription from "../models/subscription.js";

export const apiKeyAuth = async (req, res, next) => {
    try {
        const apiKey =
            req.headers["x-api-key"] ||
            (req.headers.authorization &&
                req.headers.authorization.split(" ")[1]);

        if (!apiKey) {
            throw new Error("API key required (x-api-key header)");
        }

        const admin = await Admin.findOne({
            $or: [
                { "apiKeys.test.secretKey": apiKey },
                { "apiKeys.live.secretKey": apiKey },
            ],
        }).select("-password");

        if (!admin) {
            throw new Error("Invalid API key");
        }

        req.admin = admin; // ✅ Attach admin

        // ✅ detect current API path and map to its service/subservice
        const path = req.originalUrl.toLowerCase();
        let subservice = null;

        // -----OTP subservices-----
        if (path.includes('/otp/sms')) subservice = 'sms';
        else if (path.includes('/otp/whatsapp')) subservice = 'whatsapp';
        else if (path.includes('otp/telegram')) subservice = 'telegram';

        // -----EMAIL service ------
        else if (path.includes('/email')) subservice = 'email';

        //------KYC subervices------
        else if (path.includes("/kyc/premium_nin")) subservice = "premium_nin";
        else if (path.includes("/kyc/virtual_nin")) subservice = "virtual_nin";
        else if (path.includes("/kyc/slip_nin")) subservice = "slip_nin";
        else if (path.includes("/kyc/passport")) subservice = "passport";
        else if (path.includes("/kyc/voter_card")) subservice = "voter_card";
        else if (path.includes("/kyc/drivers_licence")) subservice = "drivers_licence";

        // ✅ If the route requires subscription, verify it
        if (subservice) {
            const activeSub = await Subscription.findOne({
                admin: admin._id,
                subservice,
                active: true
            });

            if(!activeSub) {
                return res.status(403).json({
                    success: false,
                    message: `Access denied: You have not subscribed to the ${subservice.toUpperCase()} service.`
                });
            }
        }


        next();
    } catch (err) {
        console.error("API key auth error:", err.message);
        return res.status(401).json({ success: false, message: err.message })
    }
};
