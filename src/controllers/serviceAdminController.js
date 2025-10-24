import jwt from 'jsonwebtoken';
import ServiceAdmin from '../models/serviceAdmin.js';
import Organization from '../models/organization.js';

const JWT_SECRET = process.env.SERVICE_ADMIN_JWT_SECRET;

// ========================
// REGISTER (One-Time Setup)
// ========================

export const registerServiceAdmin = async (req, res) => {
    try {
        const { fullName, email, password } = req.body;

        // Check if an admin already exist
        const existingAdmin = await ServiceAdmin.findOne();
        if (existingAdmin) {
            return res.status(400).json({ success: false, message: 'Service Admin already exists.' });
        }

        const admin = await ServiceAdmin.create({ fullName, email, password });
        return res.status(201).json({
            success: true,
            message: 'Service Admin registered successfully.',
            admin: { id: admin._id, email: admin.email }
        });
    } catch (error) {
        console.error('Resgister Service Admin Error:', error);
        return res.status(500).json({ success: false, message: 'Server error', error: error.message })
    }
};

// ========================
// LOGIN
// ========================
export const loginServiceAdmin = async (req, res) => {
    try {
        const { email, password } = req.body;

        const admin = await ServiceAdmin.findOne({ email });
        if (!admin) {
            return res.status(400).json({ success: false, message: 'Invalid credentials' })
        }

        const isMatch = await admin.matchPassword(password);
        if (!isMatch) {
            return res.status(401).json({ success: false, message: 'Invalid credentials' })
        }

        const token = jwt.sign({ id: admin._id }, JWT_SECRET, { expiresIn: '7d' });

        // ✅ Detect if frontend is local
        const isLocalFrontend = req.headers.origin?.includes("localhost");

        // ✅ Set JWT as HttpOnly cookie
        res.cookie("serviceAdminToken", token, {
            httpOnly: true,
            secure: !isLocalFrontend, // false for localhost, true for live HTTPS
            sameSite: "none", // cross-origin support
            maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
        });

        return res.status(200).json({
            success: true,
            message: 'Login successfully',
            token,
            admin: { id: admin._id, email: admin.email }
        });
    } catch (error) {
        console.error('Login Service Admin Error:', error);
        return res.status(500).json({ success: false, message: 'Server error', error: error.message })
    }
}

// ========================
// LOGOUT
// ========================
export const logoutServiceAdmin = (req, res) => {
    const isLocalFrontend = req.headers.origin?.includes("localhost");

    res.clearCookie("serviceAdminToken", {
        httpOnly: true,
        secure: !isLocalFrontend, // false for localhost, true for production
        sameSite: "none",
    });

    return res.status(200).json({
        success: true,
        message: "Logout successful",
    });
};

// ========================
// GET ALL SUBMITTED ORGANIZATIONS
// ========================

export const getAllOrganizations = async (req, res) => {
    try {
        const organizations = await Organization.find().sort({ createdAt: -1 });

        return res.status(200).json({
            success: true,
            count: organizations.length,
            data: organizations
        });
    } catch (error) {
        console.error('Fetch Organizations Error:', error);
        return res.status(500).json({ success: false, message: 'Server error' })
    }
};

// ========================
// VERIFY / REJECT ORGANIZATION
// ========================

export const updateOrganizationStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const { status, feedback } = req.body;

        const VALID_STATUSES = ["verified", "rejected"];

        if (!VALID_STATUSES.includes(status)) {
            return res.status(400).json({
                success: false,
                message: "Invalid status. Use 'verified' or 'rejected'."
            })
        }

        const organization = await Organization.findByIdAndUpdate(
            id,
            {
                verificationStatus: status,
                verificationFeedback: feedback || "",
                verifiedAt: status === "verified" ? new Date() : null
            },
            { new: true }
        );

        if (!organization) {
            return res.status(404).json({ success: false, message: "Organization not found" });
        }

        return res.status(200).json({
            success: true,
            message: `Organization ${status} successfully`,
            data: organization
        })
    } catch (error) {
        console.error('Update Status Error:', error);
        return res.status(500).json({ success: false, message: 'Server error' })
    }
}


