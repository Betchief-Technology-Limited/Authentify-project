// middleware/apiKeyAuth.js
import Admin from "../models/Admin.js";

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
        next();
    } catch (err) {
        console.error("API key auth error:", err.message);
        throw err; // ❌ Don't send response here, let authOrApiKey handle it
    }
};
