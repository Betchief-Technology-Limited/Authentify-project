import crypto from 'crypto';
import bcrypt from 'bcrypt';
import Admin from '../models/Admin.js';
import { sendMail } from '../utils/mailerServiceAdmin.js';
import generateSecureToken from '../utils/tokenGenerator.js'

export const forgotPassword = async (req, res) => {
    try {
        const { email } = req.body;
        if (!email) {
            return res.status(400).json({ success: false, message: "Email required" })
        }

        const admin = await Admin.findOne({ email })
        if (!admin) {
            return res.status(404).json({ success: false, message: "Admin not found" })
        }

        // 1️⃣ Generate raw token
        const resetToken = generateSecureToken(64);

        // 2️⃣ Hash token to store securely
        const hashed = crypto.createHash("sha256").update(resetToken).digest("hex");

        // 3️⃣ Save hashed token + expiry in DB
        admin.resetPasswordToken = hashed;
        admin.resetPasswordExpires = Date.now() + 1000 * 60 * 10 // 10 minutes
        await admin.save();

        // 4️⃣ Reset link
        const resetUrl = `http://localhost:3000/reset-password?token=${resetToken}`; //this is for the frontend

        // 5️⃣ Email content
        const message = `
            <p>Hello ${admin.firstName}</p>
            <h2>You requested a password reset.</h2>
            <p>Click the link below to reset your password. This link expires in 10 minutes.</p>
            <a href="${resetUrl}" target="_blank">${resetUrl}</a>
        `;

        await sendMail({
            to: admin.email,
            subject: "Reset Your Admin Password",
            html: message
        });

        return res.status(200).json({
            success: true,
            message: "Password reset link sent to email"
        })
    } catch (err) {
        console.error("Forgot Password Error:", err);
        return res.status(500).json({ success: false, message: "Server error" });
    }
}


// Verify Reset Password
export const verifyResetToken = async (req, res) => {
    try {
        const { token } = req.query;
        if (!token)
            return res.status(400).json({ success: false, message: "Token missing" });

        const hashed = crypto.createHash("sha256").update(token).digest("hex");

        const admin = await Admin.findOne({
            resetPasswordToken: hashed,
            resetPasswordExpires: { $gt: Date.now() },
        });

        if (!admin)
            return res.status(400).json({ success: false, message: "Invalid or expired token" });

        return res.status(200).json({
            success: true,
            message: "Token valid",
        });
    } catch (err) {
        console.error("Verify Reset Token Error:", err);
        return res.status(500).json({ success: false, message: "Server error" });
    }
};


// Reset password

export const resetPassword = async (req, res) => {
    try {
        const { token, password, confirmPassword } = req.body;

        if (!token)
            return res.status(400).json({ success: false, message: "Token required" });

        if (!password || !confirmPassword)
            return res.status(400).json({ success: false, message: "Password fields required" });

        if (password !== confirmPassword)
            return res.status(400).json({ success: false, message: "Passwords do not match" });

        const hashedToken = crypto.createHash("sha256").update(token).digest("hex");

        const admin = await Admin.findOne({
            resetPasswordToken: hashedToken,
            resetPasswordExpires: { $gt: Date.now() },
        });

        if (!admin)
            return res.status(400).json({ success: false, message: "Invalid or expired token" });

        admin.password = await bcrypt.hash(password, 10);
        admin.resetPasswordToken = null;
        admin.resetPasswordExpires = null;

        await admin.save();

        return res.status(200).json({
            success: true,
            message: "Password reset successful",
        });
    } catch (err) {
        console.error("Reset Password Error:", err);
        return res.status(500).json({
            success: false,
            message: "Server error",
        });
    }
};
