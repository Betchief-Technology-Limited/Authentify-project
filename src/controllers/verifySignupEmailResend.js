import Admin from "../models/Admin.js";
import crypto from 'crypto';
import { sendVerificationEmail } from "../utils/sendEmailVerificationForSignup.js";

export const resendVerificationEmail = async (req, res) => {
    try {
        const { email } = req.body;

        if (!email) {
            return res.status(400).json({ success: false, message: "Email is required" })
        }

        const admin = await Admin.findOne({ email });

        if (!admin) {
            return res.status(404).json({ success: false, message: "User not found" });
        }

        if (admin.emailVerified) {
            return res.status(400).json({ success: false, message: "Email is already verified" });
        }

        // Generate a new verification token
        const newToken = crypto.randomBytes(32).toString('hex');
        admin.verificationToken = newToken;
        admin.verificationExpires = Date.now() + 1000 * 60 * 60 * 24 //24hrs
        await admin.save();

        const verificationUrl = `https://authentify-project.onrender.com/api/admin/verify-email?token=${newToken}`;

        sendVerificationEmail(admin.email, admin.companyName, verificationUrl).catch((err) => {
            console.error("❌ Email send error:", err.message);
        });

        return res.status(200).json({
            success: true,
            message: "A new verification email has been sent to your inbox"
        })
    } catch (error) {
        console.error("Resend verification error:", error);
        res.status(500).json({
            success: false,
            message: "Failed to resend verification email",
            error: error.message
        })
    }
}
