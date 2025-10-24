// middleware/authOrApiKey.js
import { authMiddleware } from "./jwtAuth.js";
import { apiKeyAuth } from "./apiKeyAuth.js";

export const authOrApiKey = async (req, res, next) => {
  try {
    // 🔹 Step 1: Try JWT authentication (cookie or Bearer token)
    await new Promise((resolve, reject) => {
      authMiddleware(req, res, (err) => {
        if (err) return reject(err);
        return resolve();
      });
    });

    if (req.admin) {
      // ✅ JWT succeeded
      return next();
    }
  } catch (err) {
    console.warn("JWT authentication failed:", err.message);
  }

  try {
    // 🔹 Step 2: Try API key authentication
    await new Promise((resolve, reject) => {
      apiKeyAuth(req, res, (err) => {
        if (err) return reject(err);
        return resolve();
      });
    });

    if (req.admin) {
      // ✅ API key succeeded
      return next();
    }
  } catch (err) {
    console.error("API key authentication failed:", err.message);
  }

  // 🔴 Both methods failed → reject
  return res.status(401).json({
    message: "Unauthorized (valid JWT cookie or API key required)",
  });
};
