// middleware/jwtAuth.js
import jwt from "jsonwebtoken";
import Admin from "../models/Admin.js";
import dotenv from "dotenv";

dotenv.config();

const JWT_SECRET = process.env.SECRET_KEY;

export const authMiddleware = async (req, res, next) => {
    try {
        // ✅ Read token from cookie instead of header
        let token;

        if (req.cookies && req.cookies.token) {
            token = req.cookies.token// at top of authMiddleware (temporary)
            console.log("Incoming cookies:", req.cookies);
            
        }
        // Fallback to Authorization header
        else if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
            token = req.headers.authorization.split(' ')[1];
            console.log("Auth header:", req.headers.authorization);
        }

        // No token at all
        if (!token || typeof token !== 'string') {
            throw new Error('No token provided')
        }

        // Quick format check — prevents jwt.verify throwing cryptic "jwt malformed"
        if (!/^[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+$/.test(token)) {
            throw new Error("Invalid token format");
        }

        // ✅ Verify JWT
        const decoded = jwt.verify(token, JWT_SECRET);

        // ✅ Find admin in DB (excluding the password)
        const admin = await Admin.findById(decoded.adminId).select('-password');
        if (!admin) {
            throw new Error('Admin not found');
        }
        // ✅ Attach admin to request
        req.admin = admin;
        next();
    } catch (err) {
        console.error("Auth error:", err.message);
        throw err; // ❌ don’t send response, let authOrApiKey handle
    }
};
