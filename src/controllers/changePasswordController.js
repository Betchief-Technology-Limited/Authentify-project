import bcrypt from 'bcrypt';
import Admin from '../models/Admin.js';

//✅ Change password controller
export const changePassword = async (req, res) => {
    try {
        const { currentPassword, newPassword, confirmPassword } = req.body;
        const admin = req.admin; //attached from jwtAuth middleware
        if (!currentPassword || !newPassword || !confirmPassword) {
            return res.status(400).json({ success: false, message: "All fields are required" });
        }

        // 1) Get admin record
        const existingAdmin = await Admin.findById(admin._id)

        if (!existingAdmin) {
            return res.status(404).json({ success: false, message: "Admin not found" })
        }

        //  2) Verify current password
        const isMatch = await bcrypt.compare(currentPassword, existingAdmin.password);
        if (!isMatch) {
            return res.status(400).json({ success: false, message: "current password is incorrect" });
        }

        // 3) Hash new password
        const hashedPassword = await bcrypt.hash(newPassword, 10);

        // 4) Save updated password
        existingAdmin.password = hashedPassword;
        await existingAdmin.save();

        // Optional: clear cookie session
        res.clearCookie("token");

        res.json({
            success: true,
            message: "Password changed successfully. Please log in again."
        })

    } catch (err) {
        console.error("Password change error:", err);
        res.status(500).json({ success: false, message: "Internal server error" })
    }
}