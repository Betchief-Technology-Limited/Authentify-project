import jwt from "jsonwebtoken";
import ServiceAdmin from "../models/serviceAdmin.js";

export const serviceAdminAuth = async (req, res, next) => {
    try {
        // ✅ Try to get token from both sources
        const token =
            req.cookies?.serviceAdminToken || // from secure HttpOnly cookie
            (req.headers.authorization &&
                req.headers.authorization.startsWith("Bearer ") &&
                req.headers.authorization.split(" ")[1]); // from Bearer header

        // ❌ If no token found
        if (!token) {
            return res.status(401).json({
                success: false,
                message: "Access denied. No token provided.",
            });
        }

        // ✅ Verify token
        let decoded;
        try {
            decoded = jwt.verify(token, process.env.SERVICE_ADMIN_JWT_SECRET);
        } catch (error) {
            return res
                .status(401)
                .json({ success: false, message: "Invalid or expired token." });
        }

        // ✅ Fetch the admin and attach to request
        const admin = await ServiceAdmin.findById(decoded.id).select("-password");
        if (!admin) {
            return res
                .status(401)
                .json({ success: false, message: "Invalid or expired token." });
        }

        req.serviceAdmin = admin;
        next();
    } catch (error) {
        console.error("Service Admin Auth Error:", error);
        return res.status(500).json({
            success: false,
            message: "Authentication failed.",
            error: error.message,
        });
    }
};
