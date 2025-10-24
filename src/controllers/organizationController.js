// src/controllers/organizationController.js
import Organization from "../models/organization.js";
import { uploadToCloudinary } from "../utils/cloudinary.js";

// ====================================================
// CREATE ORGANIZATION (manual verification flow)
// ====================================================
export const createOrganization = async (req, res) => {
  try {
    const { body, files } = req;

    // =============== Handle file uploads ===============
    const uploadedDocs = {};
    if (!files || Object.keys(files).length === 0) {
      return res.status(400).json({
        success: false,
        message: "At least one document must be uploaded (e.g. CAC certificate).",
      });
    }

    for (const key in files) {
      const file = files[key][0];

      if (!file.buffer) {
        return res.status(400).json({
          success: false,
          message: `File buffer missing for ${key}. Ensure you're using memoryStorage.`,
        });
      }

      try {
        const cloudUrl = await uploadToCloudinary(file.buffer, "organization_docs");
        uploadedDocs[key] = cloudUrl;
      } catch (uploadErr) {
        console.error(`❌ Cloudinary upload failed for ${key}:`, uploadErr.message);
        return res.status(500).json({
          success: false,
          message: `Failed to upload ${key} to Cloudinary.`,
          error: uploadErr.message,
        });
      }
    }

    // =============== Create Organization Record ===============
    const organization = new Organization({
      ...body,
      uploads: uploadedDocs,
      directorsOrPartners: JSON.parse(body.directorsOrPartners || "[]"),
      dataProtection: JSON.parse(body.dataProtection || "{}"),
      contactPerson: JSON.parse(body.contactPerson || "{}"),
      dataProtectionOfficer: JSON.parse(body.dataProtectionOfficer || "{}"),
      countriesOfOperation: JSON.parse(body.countriesOfOperation || "[]"),
      agreedToTerms: body.agreedToTerms === "true",
      clientId: body.clientId,
      verificationStatus: "pending",
    });

    await organization.save();

    return res.status(201).json({
      success: true,
      message:
        "✅ Organization form submitted successfully. Your documents are under review.",
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

    if (!organization) {
      return res
        .status(404)
        .json({ success: false, message: "Organization not found" });
    }

    return res.status(200).json({ success: true, data: organization });
  } catch (error) {
    console.error("Fetch organization failed:", error);
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

    if (files && Object.keys(files).length > 0) {
      const uploadedDocs = {};
      for (const key in files) {
        const file = files[key][0];
        const cloudUrl = await uploadToCloudinary(file.buffer, "organization_docs");
        uploadedDocs[key] = cloudUrl;
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
    console.error("Update organization failed:", error);
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
    console.error("Delete organization failed:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// ====================================================
// MANUAL VERIFICATION (SERVICE ADMIN)
// ====================================================
export const verifyOrganizationManually = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, feedback } = req.body; // status = verified | rejected

    const VALID_STATUSES = ["verified", "rejected"];
    if (!VALID_STATUSES.includes(status)) {
      return res.status(400).json({
        success: false,
        message: "Invalid status. Use 'verified' or 'rejected'.",
      });
    }

    const organization = await Organization.findByIdAndUpdate(
      id,
      {
        verificationStatus: status,
        verificationFeedback: feedback || "",
        verifiedAt: status === "verified" ? new Date() : null,
      },
      { new: true }
    );

    if (!organization)
      return res
        .status(404)
        .json({ success: false, message: "Organization not found" });

    res.status(200).json({
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
// CHECK VERIFICATION STATUS (Client Dashboard)
// ====================================================
export const getOrganizationVerificationStatus = async (req, res) => {
  try {
    const { clientId } = req.params;
    const organization = await Organization.findOne({ clientId });

    if (!organization)
      return res
        .status(404)
        .json({ success: false, message: "Organization not found" });

    res.status(200).json({
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
