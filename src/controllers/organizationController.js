import Organization from "../models/organization.js";
import { uploadToCloudinary } from "../utils/cloudinary.js";
import { verifyCAC } from "../utils/cacVerification.js"; // ✅ new utility
import fs from "fs/promises";

// ====================================================
// CREATE ORGANIZATION (with CAC auto verification)
// ====================================================
export const createOrganization = async (req, res) => {
    try {
        const { body, files } = req;

        // =============== Handle file uploads ===============
        const uploadedDocs = {};
        for (const key in files) {
            const file = files[key][0];
            const cloudUrl = await uploadToCloudinary(file.path, "organization_docs");
            uploadedDocs[key] = cloudUrl;
            await fs.unlink(file.path);
        }

        // =============== Auto verify CAC number ===============
        let verificationStatus = "pending";
        let verifiedAt = null;

        try {
            const cacVerified = await verifyCAC(body.registrationNumber);
            if (cacVerified) {
                verificationStatus = "approved";
                verifiedAt = new Date();
            }
        } catch (err) {
            console.error("CAC auto verification error:", err.message);
        }

        // =============== Create Organization ===============
        const organization = new Organization({
            ...body,
            uploads: uploadedDocs,
            verificationStatus,
            verifiedAt,
            directorsOrPartners: JSON.parse(body.directorsOrPartners || "[]"),
            dataProtection: JSON.parse(body.dataProtection || "{}"),
            contactPerson: JSON.parse(body.contactPerson || "{}"),
            dataProtectionOfficer: JSON.parse(body.dataProtectionOfficer || "{}"),
            countriesOfOperation: JSON.parse(body.countriesOfOperation || "[]"),
            agreedToTerms: body.agreedToTerms === "true",
            clientId: body.clientId,
        });

        await organization.save();

        return res.status(201).json({
            success: true,
            message:
                verificationStatus === "approved"
                    ? "✅ Organization verified and approved instantly via CAC!"
                    : "✅ Organization registration submitted successfully. Your documents are under manual review.",
            data: organization,
        });
    } catch (error) {
        console.error("Error creating organization:", error);
        return res.status(500).json({
            success: false,
            message: "Error creating organization",
            error: error.message,
        });
    }
};

// ====================================================
// GET ORGANIZATION BY CLIENT ID
// ====================================================
export const getOrganizationByClientId = async (req, res) => {
    try {
        const { clientId } = req.params;
        const organization = await Organization.findOne({ clientId });
        if (!organization)
            return res
                .status(404)
                .json({ success: false, message: "Organization not found" });

        return res.status(200).json({ success: true, data: organization });
    } catch (error) {
        return res.status(500).json({ success: false, message: error.message });
    }
};

// ====================================================
// UPDATE ORGANIZATION
// ====================================================
export const updateOrganization = async (req, res) => {
    try {
        const { id } = req.params;
        const { body, files } = req;
        const updates = { ...body };

        // Handle re-uploads if any
        if (files && Object.keys(files).length > 0) {
            const uploadedDocs = {};
            for (const key in files) {
                const file = files[key][0];
                const cloudUrl = await uploadToCloudinary(file.path, "organization_docs");
                uploadedDocs[key] = cloudUrl;
                await fs.unlink(file.path);
            }
            updates.uploads = uploadedDocs;
        }

        if (body.directorsOrPartners)
            updates.directorsOrPartners = JSON.parse(body.directorsOrPartners);
        if (body.contactPerson)
            updates.contactPerson = JSON.parse(body.contactPerson);
        if (body.dataProtectionOfficer)
            updates.dataProtectionOfficer = JSON.parse(body.dataProtectionOfficer);
        if (body.dataProtection)
            updates.dataProtection = JSON.parse(body.dataProtection);

        const updated = await Organization.findByIdAndUpdate(id, updates, {
            new: true,
            runValidators: true,
        });

        if (!updated)
            return res
                .status(404)
                .json({ success: false, message: "Organization not found" });

        return res
            .status(200)
            .json({ success: true, message: "Updated successfully", data: updated });
    } catch (error) {
        return res.status(500).json({ success: false, message: error.message });
    }
};

// ====================================================
// DELETE ORGANIZATION
// ====================================================
export const deleteOrganization = async (req, res) => {
    try {
        const deleted = await Organization.findByIdAndDelete(req.params.id);
        if (!deleted)
            return res
                .status(404)
                .json({ success: false, message: "Organization not found" });

        res
            .status(200)
            .json({ success: true, message: "Organization deleted successfully" });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// ====================================================
// MANUAL VERIFICATION (ADMIN)
// ====================================================
export const verifyOrganizationManually = async (req, res) => {
    try {
        const { id } = req.params;
        const { status, feedback } = req.body; // status = approved | rejected

        const organization = await Organization.findByIdAndUpdate(
            id,
            {
                verificationStatus: status,
                verificationFeedback: feedback || "",
                verifiedAt: status === "approved" ? new Date() : null,
            },
            { new: true }
        );

        if (!organization)
            return res
                .status(404)
                .json({ success: false, message: "Organization not found" });

        res.json({
            success: true,
            message: `Organization ${status} successfully.`,
            data: organization,
        });
    } catch (error) {
        console.error("Manual verification failed:", error);
        res.status(500).json({ success: false, message: "Server error" });
    }
};

// ====================================================
// CHECK VERIFICATION STATUS
// ====================================================
export const getOrganizationVerificationStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const organization = await Organization.findById(id);

        if (!organization)
            return res
                .status(404)
                .json({ success: false, message: "Organization not found" });

        res.json({
            success: true,
            data: {
                status: organization.verificationStatus,
                feedback: organization.verificationFeedback,
                verifiedAt: organization.verifiedAt,
            },
        });
    } catch (error) {
        console.error("Get verification status failed:", error);
        res.status(500).json({ success: false, message: "Server error" });
    }
};
