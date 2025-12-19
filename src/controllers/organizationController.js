
import Organization from "../models/organization.js";
import { uploadToCloudinary } from "../utils/cloudinary.js";

/* ====================================================
   CREATE OR GET DRAFT (START ONBOARDING)
==================================================== */
export const createOrGetOrganizationDraft = async (req, res) => {
  try {
    const { clientId, registeredName } = req.body;

    let organization = await Organization.findOne({ clientId });

    if (organization) {
      return res.status(200).json({
        success: true,
        message: "Organization drafted loaded",
        data: organization
      })
    }

    organization = await Organization.create({
      clientId,
      businessProfile: {
         registeredName: registeredName || "" 
        }, //auto-filled
      onboardingStatus: "draft",
      verificationStatus: "not_submitted",
      currentStep: 1,
      uploads: {}
    });

    res.status(201).json({
      success: true,
      message: "Organization draft created",
      data: organization
    });

    console.log("📄 Draft endpoint hit for client:", clientId);

  } catch (error) {
    res.status(500).json({ success: false, message: error.message })
  }
}


/* ====================================================
   SAVE DRAFT (AUTO-SAVE / SAVE & CONTINUE LATER)
==================================================== */
export const saveOrganizationDraft = async (req, res) => {
  try {
    const { id } = req.params;
    const { step, payload } = req.body;

    const organization = await Organization.findById(id);

    if (!organization) {
      return res.status(400).json({ success: false, message: "Organization not found" });
    }

    if (organization.onboardingStatus === "submitted") {
      return res.status(403).json({
        succees: false,
        message: "Submitted organization cannot be modified"
      });
    }

    Object.assign(organization, payload);

    organization.currentStep = step;
    organization.lastSavedAt = new Date();

    if (!organization.completedSteps.includes(step)) {
      organization.completedSteps.push(step)
    }

    organization.completionPercentage = Math.min(step * 20, 100);

    await organization.save({ validateBeforeSave: false });

    res.status(200).json({
      success: true,
      message: "Draft saved successfully",
      data: organization
    })
  } catch (error) {
    res.status(500).json({ success: false, message: error.message })
  }
}


/* ====================================================
   UPLOAD DOCUMENTS (INCREMENTAL)
==================================================== */
export const uploadOrganizationDocuments = async (req, res) => {
  try {
    const { id } = req.params;
    const files = req.files;

    const organization = await Organization.findById(id);
    if (!organization) {
      return res.status(404).json({
        success: false,
        message: "Organization not found"
      })
    }

    if (organization.onboardingStatus === "submitted") {
      res.status(403).json({
        success: false,
        message: "Cannot upload documents after submission"
      });
    }


    // ✅ ENSURE uploads object exists
    if (!organization.uploads) {
      organization.uploads = {};
    }

    for (const key in files) {
      const file = files[key][0];
      const url = await uploadToCloudinary(file.buffer, "organization_docs");
      organization.uploads[key] = url;
    }

    organization.lastSavedAt = new Date();
    await organization.save({ validateBeforeSave: false });

    res.status(200).json({
      success: true,
      message: "Documents uploaded successfully",
      data: organization
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
}

/* ====================================================
   FINAL SUBMISSION (STRICT VALIDATION)
==================================================== */
export const submitOrganization = async (req, res) => {
  try {
    const { id } = req.params;

    const organization = await Organization.findById(id);

    if (!organization) {
      return res.status(404).json({ success: false, message: "Organization not found" })
    }

    if (organization.onboardingStatus === "submitted") {
      return res.status(400).json({ success: false, message: "Already submitted" })
    }

    organization.onboardingStatus = 'submitted';
    organization.verificationStatus = 'pending';

    await organization.save(); //validation enforced here

    res.status(200).json({
      success: true,
      message: "Organization submitted successfully"
    });
  } catch (error) {
    console.error("SUBMIT VALIDATION ERROR:", error);
    res.status(400).json({
      success: false,
      message: "Submission failed",
      error: error.message,
    });
  }
}

/* ====================================================
   RESUME ONBOARDING / FETCH BY CLIENT
==================================================== */
export const getOrganizationByClientId = async (req, res) => {
  try {
    const { clientId } = req.params;
    const organization = await Organization.findOne({ clientId });

    if (!organization) {
      return res.status(200).json({
        success: true,
        data: { status: "not_submitted", organization: null },
      });
    }

    res.status(200).json({ success: true, data: organization });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/* ====================================================
   ADMIN VERIFICATION + EMAIL NOTIFICATION FLAG
==================================================== */
export const verifyOrganizationManually = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, feedback } = req.body;

    if (!["verified", "rejected"].includes(status)) {
      return res.status(400).json({ success: false, message: "Invalid status" });
    }

    const organization = await Organization.findByIdAndUpdate(
      id,
      {
        verificationStatus: status,
        verificationFeedback: feedback || "",
        verifiedAt: status === "verified" ? new Date() : null,
        emailNotification: { sent: false },
      },
      { new: true }
    );

    if (!organization) {
      return res.status(404).json({ success: false, message: "Organization not found" });
    }

    res.status(200).json({
      success: true,
      message: `Organization ${status} successfully`,
      data: organization,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: "Server error" });
  }
};

/* ====================================================
   CLIENT DASHBOARD – VERIFICATION STATUS
==================================================== */
export const getOrganizationVerificationStatus = async (req, res) => {
  try {
    const { clientId } = req.params;
    const organization = await Organization.findOne({ clientId });

    if (!organization) {
      return res.status(200).json({
        success: true,
        data: { status: "not_submitted", feedback: "", verifiedAt: null },
      });
    }

    res.status(200).json({
      success: true,
      data: {
        status: organization.verificationStatus,
        feedback: organization.verificationFeedback,
        verifiedAt: organization.verifiedAt,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: "Server error" });
  }
};









































// import Organization from "../models/organization.js";
// import { uploadToCloudinary } from "../utils/cloudinary.js";

// // ====================================================
// // CREATE ORGANIZATION (manual verification flow)
// // ====================================================
// export const createOrganization = async (req, res) => {
//   try {
//     const { body, files } = req;

//     console.log("🧾 Incoming organization form data:");
//     console.log("Body fields =>", body);
//     console.log("Files received =>", Object.keys(files || {}));

//     // ✅ Check if client already has an organization
//     const existingOrg = await Organization.findOne({ clientId: body.clientId });
//     if (existingOrg) {
//       return res.status(400).json({
//         success: false,
//         message: "An organization profile already exists for this client.",
//         existingStatus: existingOrg.verificationStatus,
//       });
//     }

//     // Ensure at least required docs are uploaded
//     const requiredFiles = ["certificateOfIncorporation", "particularsOfDirectors"];
//     for (const f of requiredFiles) {
//       if (!files?.[f]) {
//         return res.status(400).json({
//           success: false,
//           message: `Missing required file: ${f}`,
//         });
//       }
//     }

//     // =============== Handle file uploads ===============
//     const uploadedDocs = {};
//     // if (!files || Object.keys(files).length === 0) {
//     //   return res.status(400).json({
//     //     success: false,
//     //     message: "At least one document must be uploaded (e.g. CAC certificate).",
//     //   });
//     // }

//     for (const key in files) {
//       const file = files[key][0];
//        console.log(`File ${key}:`, files[key][0].originalname);

//       if (!file.buffer) {
//         return res.status(400).json({
//           success: false,
//           message: `File buffer missing for ${key}. Ensure you're using memoryStorage.`,
//         });
//       }

//       try {
//         const cloudUrl = await uploadToCloudinary(file.buffer, "organization_docs");
//         uploadedDocs[key] = cloudUrl;
//       } catch (uploadErr) {
//         console.error(`❌ Cloudinary upload failed for ${key}:`, uploadErr.message);
//         return res.status(500).json({
//           success: false,
//           message: `Failed to upload ${key} to Cloudinary.`,
//           error: uploadErr.message,
//         });
//       }
//     }

//     const safeParse = (field, fallback) => {
//       try {
//         return field ? JSON.parse(field) : fallback;
//       } catch {
//         return fallback;
//       }
//     };

//     // =============== Create Organization Record ===============
//     const organization = new Organization({
//       registeredName: body.registeredName,
//       registrationNumber: body.registrationNumber,
//       officeAddress: body.officeAddress,
//       countryOfIncorporation: body.countryOfIncorporation,
//       serviceCategory: body.serviceCategory,
//       directorsOrPartners: safeParse(body.directorsOrPartners, []),

//       contactPerson: safeParse(body.contactPerson, {}),
//       dataProtectionOfficer: safeParse(body.dataProtectionOfficer, {}),
//       uploads: uploadedDocs,

//       // 10 supplemental Yes/No booleans (UI radio buttons)
//       requiresLicense: body.requiresLicense === "true",
//       servicesRegulatedByAuthority: body.servicesRegulatedByAuthority === "true",
//       complyWithAntiLaundering: body.complyWithAntiLaundering === "true",
//       hasAntiLaunderingPolicies: body.hasAntiLaunderingPolicies === "true",
//       hasNdaWithStaff: body.hasNdaWithStaff === "true",
//       hasSanctionsForLaundering: body.hasSanctionsForLaundering === "true",
//       hasSanctionsForDataBreach: body.hasSanctionsForDataBreach === "true",
//       hasDataProtectionPolicy: body.hasDataProtectionPolicy === "true",

//       // nested dataProtection section
//       dataProtection: safeParse(body.dataProtection, {}),

//       agreedToTerms: body.agreedToTerms === "true",
//       clientId: body.clientId,
//       verificationStatus: "pending",
//     });

//     await organization.save();

//     return res.status(201).json({
//       success: true,
//       message:
//         "✅ Organization form submitted successfully. Your documents are under review.",
//       data: organization,
//     });
//   } catch (error) {
//     console.error("Error creating organization:", error);
//     return res.status(500).json({
//       success: false,
//       message: "Error creating organization",
//       error: error.message,
//     });
//   }
// };

// // ====================================================
// // GET ORGANIZATION BY CLIENT ID
// // ====================================================
// export const getOrganizationByClientId = async (req, res) => {
//   try {
//     const { clientId } = req.params;
//     const organization = await Organization.findOne({ clientId });

//     // ✅ Return status as "not_submitted" if none exists (for frontend)
//     if (!organization) {
//       return res.status(200).json({
//         success: true,
//         message: "Organization form not yet submitted.",
//         data: {
//           status: "not_submitted",
//           organization: null,
//         },
//       });
//     }

//     return res.status(200).json({
//       success: true,
//       data: organization
//     });
//   } catch (error) {
//     console.error("Fetch organization failed:", error);
//     return res.status(500).json({ success: false, message: error.message });
//   }
// };

// // ====================================================
// // UPDATE ORGANIZATION
// // ====================================================
// export const updateOrganization = async (req, res) => {
//   try {
//     const { id } = req.params;
//     const { body, files } = req;
//     const updates = { ...body };

//     // re-upload if any files updated

//     if (files && Object.keys(files).length > 0) {
//       const uploadedDocs = {};
//       for (const key in files) {
//         const file = files[key][0];
//         const cloudUrl = await uploadToCloudinary(file.buffer, "organization_docs");
//         uploadedDocs[key] = cloudUrl;
//       }
//       updates.uploads = uploadedDocs;
//     }

//     // parse nested objects if stringified
//     const safeParse = (field, fallback) => {
//       try {
//         return field ? JSON.parse(field) : fallback;
//       } catch {
//         return fallback;
//       }
//     };

//     if (body.directorsOrPartners)
//       updates.directorsOrPartners = safeParse(body.directorsOrPartners, []);
//     if (body.contactPerson)
//       updates.contactPerson = safeParse(body.contactPerson, {});
//     if (body.dataProtectionOfficer)
//       updates.dataProtectionOfficer = safeParse(body.dataProtectionOfficer, {});
//     if (body.dataProtection)
//       updates.dataProtection = safeParse(body.dataProtection, {});

//     const updated = await Organization.findByIdAndUpdate(id, updates, {
//       new: true,
//       runValidators: true,
//     });

//     if (!updated)
//       return res
//         .status(404)
//         .json({ success: false, message: "Organization not found" });

//     return res
//       .status(200)
//       .json({ success: true, message: "Updated successfully", data: updated });
//   } catch (error) {
//     console.error("Update organization failed:", error);
//     return res.status(500).json({ success: false, message: error.message });
//   }
// };

// // ====================================================
// // DELETE ORGANIZATION
// // ====================================================
// export const deleteOrganization = async (req, res) => {
//   try {
//     const deleted = await Organization.findByIdAndDelete(req.params.id);

//     if (!deleted)
//       return res
//         .status(404)
//         .json({ success: false, message: "Organization not found" });

//     res
//       .status(200)
//       .json({ success: true, message: "Organization deleted successfully" });
//   } catch (error) {
//     console.error("Delete organization failed:", error);
//     res.status(500).json({ success: false, message: error.message });
//   }
// };

// // ====================================================
// // MANUAL VERIFICATION (SERVICE ADMIN)
// // ====================================================
// export const verifyOrganizationManually = async (req, res) => {
//   try {
//     const { id } = req.params;
//     const { status, feedback } = req.body; // status = verified | rejected

//     const VALID_STATUSES = ["verified", "rejected"];
//     if (!VALID_STATUSES.includes(status)) {
//       return res.status(400).json({
//         success: false,
//         message: "Invalid status. Use 'verified' or 'rejected'.",
//       });
//     }

//     const organization = await Organization.findByIdAndUpdate(
//       id,
//       {
//         verificationStatus: status,
//         verificationFeedback: feedback || "",
//         verifiedAt: status === "verified" ? new Date() : null,
//       },
//       { new: true }
//     );

//     if (!organization)
//       return res
//         .status(404)
//         .json({ success: false, message: "Organization not found" });

//     res.status(200).json({
//       success: true,
//       message: `Organization ${status} successfully.`,
//       data: organization,
//     });
//   } catch (error) {
//     console.error("Manual verification failed:", error);
//     res.status(500).json({ success: false, message: "Server error" });
//   }
// };

// // ====================================================
// // CHECK VERIFICATION STATUS (Client Dashboard)
// // ====================================================
// export const getOrganizationVerificationStatus = async (req, res) => {
//   try {
//     const { clientId } = req.params;
//     const organization = await Organization.findOne({ clientId });

//     // ✅ Handle no organization case
//     if (!organization) {
//       return res.status(200).json({
//         success: true,
//         message: "Organization form not yet submitted",
//         data: {
//           status: "not_submitted",
//           feedback: "",
//           verifiedAt: null
//         },
//       });
//     }

//     res.status(200).json({
//       success: true,
//       message: "Organization verification status retrieved successfully",
//       data: {
//         status: organization.verificationStatus,
//         feedback: organization.verificationFeedback,
//         verifiedAt: organization.verifiedAt,
//       },
//     });
//   } catch (error) {
//     console.error("Get verification status failed:", error);
//     res.status(500).json({ success: false, message: "Server error" });
//   }
// };
