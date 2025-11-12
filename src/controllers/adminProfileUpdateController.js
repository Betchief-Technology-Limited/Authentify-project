import Admin from "../models/Admin.js";

/**
 * @desc Update Admin Account Information
 * @route PUT /api/admin/profile
 * @access Private (requires JWT)
 */

export const updateAdminProfile = async (req, res) => {
    try {
        const adminId = req.admin._id; // from JWT middleware
        const { firstName, lastName, email } = req.body;

        // Validate input
        if (!firstName || !lastName || !email) {
            return res.status(400).json({ success: false, message: "All fields are required" });
        }

        // Check for email conflict
        const existing = await Admin.findOne({ email, _id: { $ne: adminId } });
        if (existing) {
            return res.status(400).json({ success: false, message: "Email already in use" });
        }

        // Update admin details
        const updatedAdmin = await Admin.findByIdAndUpdate(
            adminId,
            { firstName, lastName, email },
            { new: true, runValidators: true }
        ).select("-password -verificationToken -verificationExpires");

        res.status(200).json({
            success: true,
            message: "Account information updated successfully",
            admin: updatedAdmin
        });
    } catch (err) {
        console.error("Profile update error:", err);
        res.status(500).json({ success: false, message: "Server error" });
    }
};