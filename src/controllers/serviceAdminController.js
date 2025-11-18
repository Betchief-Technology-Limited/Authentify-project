import jwt from 'jsonwebtoken';
import ServiceAdmin from '../models/serviceAdmin.js';
import Organization from '../models/organization.js';
import { verifiedTemplate, rejectedTemplate } from '../utils/serviceAdminEmailTemplate.js';
import { sendMail } from '../utils/mailerServiceAdmin.js';
import Admin from '../models/Admin.js';

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
        return res.status(500).json({
            success: false,
            message: 'Server error',
            error: error.message
        })
    }
};

// ========================
// LOGIN
// ========================
export const loginServiceAdmin = async (req, res) => {
    try {
        const { email, password } = req.body;

        const admin = await ServiceAdmin.findOne({ email });
        if (!admin || !(await admin.matchPassword(password))) {
            return res.status(400).json({ success: false, message: 'Invalid credentials' })
        }

        // const isMatch = await admin.matchPassword(password);
        // if (!isMatch) {
        //     return res.status(401).json({ success: false, message: 'Invalid credentials' })
        // }

        const token = jwt.sign({ id: admin._id }, JWT_SECRET, { expiresIn: '7d' });


        res.cookie('serviceAdminToken', token, {
            httpOnly: true, //cant be access with JS
            secure: process.env.NODE_ENV === 'production', //only over http then switch to https when it is over in production
            sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
            maxAge: 60 * 60 * 1000, // 1hour
        });

        return res.status(200).json({
            success: true,
            message: 'Login successfully',
            token,
            admin: { id: admin._id, email: admin.email }
        });
    } catch (error) {
        console.error('Login Service Admin Error:', error);
        return res.status(500).json({
            success: false,
            message: 'Server error',
            error: error.message
        })
    }
}

// ========================
// LOGOUT
// ========================
export const logoutServiceAdmin = (req, res) => {
    res.clearCookie('serviceAdminToken', {
        httpOnly: true, //cant be access with JS
        secure: process.env.NODE_ENV === 'production', //only over http then switch to https when it is over in production
        sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
    });

    return res.status(200).json({
        success: true,
        message: "Logout successful",
    });
};

// ========================
// GET ALL SUBMITTED ORGANIZATIONS
// ========================

// export const getAllOrganizations = async (req, res) => {
//     try {
//         const organizations = await Organization.find().sort({ createdAt: -1 });

//         return res.status(200).json({
//             success: true,
//             count: organizations.length,
//             data: organizations
//         });
//     } catch (error) {
//         console.error('Fetch Organizations Error:', error);
//         return res.status(500).json({ success: false, message: 'Server error' })
//     }
// };

export const getAllOrganizations = async (req, res) => {
  try {
    const { status } = req.query;

    let query = {};
    if (status && ["pending", "verified", "rejected"].includes(status.toLowerCase())) {
      query.verificationStatus = status.toLowerCase();
    }

    const organizations = await Organization.find(query).sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      count: organizations.length,
      data: organizations,
    });
  } catch (error) {
    console.error("Fetch Organizations Error:", error);
    return res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
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

        const organization = await Organization.findById(id);
        if (!organization)
            return res.status(404).json({ success: false, message: "Organization not found" });

        // Update verification status + feedback
        organization.verificationStatus = status;
        organization.verificationFeedback = feedback || "";

        // 1️⃣ Fetch organization owner (admin who submitted the form)
        const organizationOwner = await Admin.findById(organization.clientId);
        if (!organizationOwner) {
            return res.status(404).json({
                success: false,
                message: "Organization owner (Admin) not found",
            });
        }

        // 2️⃣ Determine contact person email
        const recipient =
            organization?.contactPerson?.email ||
            organization?.dataProtectionOfficer?.contactEmail ||
            null;

        if (!recipient) {
            return res.status(400).json({
                success: false,
                message: "No valid recipient email found",
            });
        }

        // 3️⃣ Prepare email template
        const tpl =
            status === "verified"
                ? verifiedTemplate(organization)
                : rejectedTemplate(organization, feedback);

        // 4️⃣ Send the email (to contact person and to organization owner)
        try {
            await sendMail({
                to: [recipient, organizationOwner.email],
                // cc: [organizationOwner.email],
                subject: tpl.subject,
                html: tpl.html,
                text: tpl.text,
            });

            organization.emailNotification.sent = true;
            organization.emailNotification.sentAt = new Date();
        } catch (mailErr) {
            console.error("Email notify failed:", mailErr.message);
        }

        // Save updated organization
        await organization.save();

        return res.status(200).json({
            success: true,
            message: `Organization ${status} successfully.`,
            data: organization,
        });
    } catch (error) {
        console.error("Update Status Error:", error);
        return res.status(500).json({
            success: false,
            message: "Server error",
            error: error.message,
        });
    }
};


// export const updateOrganizationStatus = async (req, res) => {
//     try {
//         const { id } = req.params;
//         const { status, feedback } = req.body;

//         const VALID_STATUSES = ["verified", "rejected"];

//         if (!VALID_STATUSES.includes(status)) {
//             return res.status(400).json({
//                 success: false,
//                 message: "Invalid status. Use 'verified' or 'rejected'."
//             })
//         }

//         // const organization = await Organization.findByIdAndUpdate(
//         //     id,
//         //     {
//         //         verificationStatus: status,
//         //         verificationFeedback: feedback || "",
//         //         verifiedAt: status === "verified" ? new Date() : null
//         //     },
//         //     { new: true }
//         // );

//         // if (!organization) {
//         //     return res.status(404).json({ success: false, message: "Organization not found" });
//         // }
//         const organization = await Organization.findById(id);
//         if (!organization)
//             return res
//                 .status(404)
//                 .json({ success: false, message: "Organization not found" });

//         organization.verificationStatus = status;
//         organization.verificationFeedback = feedback || "";
//         organization.verifiedAt = status === "verified" ? new Date() : null;

//         // -------EMAIL NOTIFICATION-------
//         // Get the loggrd-in admin info
//         const admin = await Admin.findById(organization.clientId);
//         if (!admin) {
//             return res.status(400).json({ success: false, message: "Admin not found" })
//         }

//         // Determine recipient (organization representative)
//         const recipient =
//             organization?.contactPerson?.email ||
//             organization?.dataProtectionOfficer?.contactEmail ||
//             null;

//         if (recipient && admin?.email) {
//             try {
//                 const tpl =
//                     status === "verified"
//                         ? verifiedTemplate(organization)
//                         : rejectedTemplate(organization, feedback);

//                 await sendMail({
//                     to: recipient,
//                     cc: [admin.email, "caroline.mato1@gmail.com"],
//                     subject: tpl.subject,
//                     html: tpl.html,
//                     text: tpl.text,
//                 });

//                 organization.emailNotification.sent = true;
//                 organization.emailNotification.sentAt = new Date();
//             } catch (mailErr) {
//                 console.error("Email notify failed:", mailErr.message);
//             }
//         }

//         await organization.save();

//         return res.status(200).json({
//             success: true,
//             message: `Organization ${status} successfully.`,
//             data: organization,
//         });
//     } catch (error) {
//         console.error("Update Status Error:", error);
//         return res.status(500).json({
//             success: false,
//             message: "Server error",
//             error: error.message,
//         });
//     }
// };



// ========================
// MANUAL RESEND EMAIL NOTIFICATION
// ========================

export const resendVerificationEmail = async (req, res) => {
    try {
        const { id } = req.params;

        // 1️⃣ Ensure organization exists
        const organization = await Organization.findById(id);
        if (!organization) {
            return res.status(404).json({
                success: false,
                message: "Organization not found",
            });
        }

        // 2️⃣ Identify primary recipient
        const recipient =
            organization?.contactPerson?.email ||
            organization?.dataProtectionOfficer?.contactEmail ||
            null;

        if (!recipient) {
            return res.status(400).json({
                success: false,
                message: "No valid recipient email found for this organization",
            });
        }

        // 3️⃣ Fetch admin email for CC
        const admin = await Admin.findOne({ _id: req.admin._id });
        if (!admin || !admin.email) {
            return res.status(400).json({
                success: false,
                message: "Could not identify admin email for CC",
            });
        }

        // 4️⃣ Select the appropriate email template
        const status = organization.verificationStatus;
        const tpl =
            status === "verified"
                ? verifiedTemplate(organization)
                : rejectedTemplate(organization, organization.verificationFeedback || "");

        // 5️⃣ Send email with CC
        await sendMail({
            to: recipient,
            cc: admin.email,   // <-- CC admin performing the resend
            subject: tpl.subject,
            html: tpl.html,
            text: tpl.text,
        });

        // 6️⃣ Update audit logs
        organization.emailNotification.sent = true;
        organization.emailNotification.sentAt = new Date();
        await organization.save();

        // 7️⃣ Success response
        return res.status(200).json({
            success: true,
            message: "Verification email re-sent successfully",
            data: organization,
        });

    } catch (error) {
        console.error("Resend Email Error:", error);
        return res.status(500).json({
            success: false,
            message: "Failed to resend verification email",
            error: error.message,
        });
    }
};










// ========================
// MANUAL RESEND EMAIL NOTIFICATION
// ========================
// export const resendVerificationEmail = async (req, res) => {
//     try {
//         const { id } = req.params;

//         const organization = await Organization.findById(id);
//         if (!organization)
//             return res.status(404).json({ success: false, message: "Organization not found" });

//         // Determine recipient
//         const recipient =
//             organization?.contactPerson?.email ||
//             organization?.contactEmail ||
//             null;

//         if (!recipient)
//             return res.status(400).json({
//                 success: false,
//                 message: "No recipient email found for this organization",
//             });

//         // Determine which template to use
//         const status = organization.verificationStatus;
//         const tpl =
//             status === "verified"
//                 ? verifiedTemplate(organization)
//                 : rejectedTemplate(organization, organization.verificationFeedback || "");

//         await sendMail({
//             to: recipient,
//             subject: tpl.subject,
//             html: tpl.html,
//             text: tpl.text,
//         });

//         // ✅ Update email audit fields
//         organization.emailNotification.sent = true;
//         organization.emailNotification.sentAt = new Date();
//         await organization.save();

//         return res.status(200).json({
//             success: true,
//             message: "Email re-sent successfully",
//             data: organization,
//         });
//     } catch (error) {
//         console.error("Resend Email Error:", error);
//         return res.status(500).json({
//             success: false,
//             message: "Failed to resend email",
//             error: error.message,
//         });
//     }
// };


