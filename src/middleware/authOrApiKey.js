// middleware/authOrApiKey.js
import { authMiddleware } from "./jwtAuth.js";
import { apiKeyAuth } from "./apiKeyAuth.js";

export const authOrApiKey = async (req, res, next) => {
    // 🔹 Step 1: Try JWT authentication (cookie-based)
    try {
        await new Promise ((resolve, reject) =>{
            authMiddleware(req, res, (err) => (err ? reject(err) : resolve())); // run jwtAuth manually

        });

        if (req.admin) {
            // ✅ JWT succeeded → allow request
            return next();
        }
    } catch (err) {
        // 🔴 IMPORTANT: Don't send a response here
        // Just log and continue to API key check
        console.warn("JWT authentication failed:", err.message);
    }

    // 🔹 Step 2: Try API key authentication
    try {
        await new Promise((resolve, reject) =>{
            apiKeyAuth(req, res, (err) =>(err)=>(err ? reject(err) : resolve())); // run apiKeyAuth manually
        })

        if (req.admin) {
            // ✅ API key succeeded → allow request
            return next();
        }
    } catch (err) {
        console.error("API key authentication failed:", err.message);

        // 🔴 Both methods failed → reject
        return res.status(401).json({
            message: "Unauthorized (valid JWT cookie or API key required)",
        });
    }
};
