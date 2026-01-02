import Admin from "../models/Admin.js";
// import { generateApiKeys } from "../utils/apiKeyGenerator.js";
import { generatePublicKey, generateSecretKey } from "../utils/apiKeyGenerator.js";

async function regenerateApiKeys(req, res) {
    try {
        const adminId = req.admin._id;
        const { mode } = req.body;

        if(!["test", "live"].includes(mode)){
            return res.status(400).json({
                success: false,
                message: "Mode must be 'test' or 'live'"
            })
        }

        const admin = await Admin.findById(adminId);
        if(!admin) {
            return res.status(404).json({
                success: false,
                message: "Admin not found"
            })
        }

        // 🔒 Gate live keys

        if(
            mode === "live" &&
            (admin.walletBalance <= 0 || !admin.emailVerified)
        ) {
            return res.status(403).json({
                success: false,
                message: "Live keys require verified account and funded wallet"
            })
        }
    
        // This is to generate the publick API key
        const publicKey = generatePublicKey(mode);
        const { secretKey, secretHash } = await generateSecretKey(mode)
        // const { publicKey, secretKey } = await generateApiKeys(mode);

        admin.apiKeys[mode] = {
            publicKey,
            secretKey,
            createdAt: admin.apiKeys?.[mode]?.createdAt || new Date(),
            lastRotatedAt: new Date()
        };

        await admin.save();

        // Return secret ONCE
        return res.status(200).json({
            success: true,
            message: "API keys generated successfully",
            apiKeys: {
                publicKey,
                secretKey, 
                // secretHash
            }
        });
    } catch (error) {
        console.error("Regenerate API key error:", error);
        res.status(500).json({
            success: false,
            message: "Server error",
            error: error.message
        })
    }
}

export default regenerateApiKeys;