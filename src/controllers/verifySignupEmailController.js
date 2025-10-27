import Admin from "../models/Admin.js";

export const verifyEmail = async (req, res) => {
    try {
        const { token, mode } = req.query;
        if (!token) {
            if (mode === "json") {
                return res.status(400).json({ success: false, message: "Missing token" });
            }
            return res.redirect("http://localhost:5173/verify-failed?reason=missing_token");
        }

        const admin = await Admin.findOne({
            verificationToken: token,
            verificationExpires: { $gt: Date.now() },
        });

        if (!admin) {
            if (mode === "json") {
                return res
                    .status(400)
                    .json({ success: false, message: "Invalid or expired verification link." });
            }
            return res.redirect("http://localhost:5173/verify-failed?reason=invalid_or_expired");
        }

        admin.emailVerified = true;
        admin.verificationToken = null;
        admin.verificationExpires = null;
        await admin.save();

        if (mode === "json") {
            return res.status(200).json({
                success: true,
                message: "Email verified successfully. You can now log in.",
            });
        }

        // Default behavior (browser redirect)
        return res.redirect("http://localhost:5173/verified-success");
    } catch (error) {
        console.error("❌ Email verification error:", error);
        if (req.query.mode === "json") {
            return res.status(500).json({ success: false, message: "Server error" });
        }
        return res.redirect("http://localhost:5173/verify-failed?reason=server_error");
    }
};
