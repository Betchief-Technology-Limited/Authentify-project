// middleware/universalAuth.js
import jwt from "jsonwebtoken";
import Admin from "../models/Admin.js";
import Subscription from "../models/subscription.js";
import dotenv from "dotenv";

dotenv.config();
const JWT_SECRET = process.env.SECRET_KEY;

export const apiKeyAuth = async (req, res, next) => {
  try {
    let tokenOrKey =
      req.headers["x-api-key"] ||
      (req.headers.authorization &&
        req.headers.authorization.split(" ")[1]);

    if (!tokenOrKey) {
      throw new Error("Missing API key or Bearer token");
    }

    let admin = null;

    // --- 1️⃣ Try verifying as API key ---
    admin = await Admin.findOne({
      $or: [
        { "apiKeys.test.secretKey": tokenOrKey },
        { "apiKeys.live.secretKey": tokenOrKey },
      ],
    }).select("-password");

    // --- 2️⃣ If no API key found, try verifying as JWT ---
    if (!admin) {
      try {
        const decoded = jwt.verify(tokenOrKey, JWT_SECRET);
        const adminId = decoded.adminId || decoded.id || decoded._id;

        if (!adminId) throw new Error("Invalid JWT payload");
        admin = await Admin.findById(adminId).select("-password");
      } catch (err) {
        throw new Error("Invalid API key or JWT token");
      }
    }

    if (!admin) {
      throw new Error("Admin not found");
    }

    req.admin = admin;

    // --- 3️⃣ Subscription check (same as your existing logic) ---
    const path = req.originalUrl.toLowerCase();
    let subservice = null;

    if (path.includes("/otp/sms")) subservice = "sms";
    else if (path.includes("/otp/whatsapp")) subservice = "whatsapp";
    else if (path.includes("otp/telegram")) subservice = "telegram";
    else if (path.includes("/email")) subservice = "email";
    else if (path.includes("/kyc/premium_nin")) subservice = "premium_nin";
    else if (path.includes("/kyc/virtual_nin")) subservice = "virtual_nin";
    else if (path.includes("/kyc/slip_nin")) subservice = "slip_nin";
    else if (path.includes("/kyc/passport")) subservice = "passport";
    else if (path.includes("/kyc/voter_card")) subservice = "voter_card";
    else if (path.includes("/kyc/drivers_licence")) subservice = "drivers_licence";

    if (subservice) {
      const activeSub = await Subscription.findOne({
        admin: admin._id,
        subservice,
        active: true,
      });

      if (!activeSub) {
        return res.status(403).json({
          success: false,
          message: `Access denied: You have not subscribed to the ${subservice.toUpperCase()} service.`,
        });
      }
    }

    next();
  } catch (err) {
    console.error("Universal auth error:", err.message);
    return res.status(401).json({ success: false, message: err.message });
  }
};






// // middleware/apiKeyAuth.js
// import Admin from "../models/Admin.js";
// import Subscription from "../models/subscription.js";

// export const apiKeyAuth = async (req, res, next) => {
//     try {
//         const apiKey =
//             req.headers["x-api-key"] ||
//             (req.headers.authorization &&
//                 req.headers.authorization.split(" ")[1]);

//         if (!apiKey) {
//             throw new Error("API key required (x-api-key header)");
//         }

//         const admin = await Admin.findOne({
//             $or: [
//                 { "apiKeys.test.secretKey": apiKey },
//                 { "apiKeys.live.secretKey": apiKey },
//             ],
//         }).select("-password");

//         if (!admin) {
//             throw new Error("Invalid API key");
//         }

//         req.admin = admin; // ✅ Attach admin

//         // ✅ detect current API path and map to its service/subservice
//         const path = req.originalUrl.toLowerCase();
//         let subservice = null;

//         // -----OTP subservices-----
//         if (path.includes('/otp/sms')) subservice = 'sms';
//         else if (path.includes('/otp/whatsapp')) subservice = 'whatsapp';
//         else if (path.includes('otp/telegram')) subservice = 'telegram';

//         // -----EMAIL service ------
//         else if (path.includes('/email')) subservice = 'email';

//         //------KYC subervices------
//         else if (path.includes("/kyc/premium_nin")) subservice = "premium_nin";
//         else if (path.includes("/kyc/virtual_nin")) subservice = "virtual_nin";
//         else if (path.includes("/kyc/slip_nin")) subservice = "slip_nin";
//         else if (path.includes("/kyc/passport")) subservice = "passport";
//         else if (path.includes("/kyc/voter_card")) subservice = "voter_card";
//         else if (path.includes("/kyc/drivers_licence")) subservice = "drivers_licence";

//         // ✅ If the route requires subscription, verify it
//         if (subservice) {
//             const activeSub = await Subscription.findOne({
//                 admin: admin._id,
//                 subservice,
//                 active: true
//             });

//             if(!activeSub) {
//                 return res.status(403).json({
//                     success: false,
//                     message: `Access denied: You have not subscribed to the ${subservice.toUpperCase()} service.`
//                 });
//             }
//         }


//         next();
//     } catch (err) {
//         console.error("API key auth error:", err.message);
//         return res.status(401).json({ success: false, message: err.message })
//     }
// };
