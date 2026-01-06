
import Organization from "../models/organization.js";
import { uploadToCloudinary } from "../utils/cloudinary.js";


   //CREATE OR GET DRAFT (START ONBOARDING)

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
      completedSteps: [],
      completionPercentage: 0,
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


// SAVE DRAFT (AUTO-SAVE / SAVE & CONTINUE LATER)
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
        success: false,
        message: "Submitted organization cannot be modified"
      });
    }

    // ✅ apply payload
    Object.assign(organization, payload);

    // ✅ advance step
    organization.currentStep = Math.max(
      organization.currentStep || 1,
      step + 1
    );

    organization.lastSavedAt = new Date();

    if (!organization.completedSteps.includes(step)) {
      organization.completedSteps.push(step);
    }

    organization.completionPercentage = Math.min(
      organization.currentStep * 20,
      100
    );

    await organization.save({ validateBeforeSave: false });

    res.status(200).json({
      success: true,
      message: "Draft saved successfully",
      data: organization
    });

  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// export const saveOrganizationDraft = async (req, res) => {
//   try {
//     const { id } = req.params;
//     const { step, payload } = req.body;

//     const organization = await Organization.findById(id);

//     if (!organization) {
//       return res.status(400).json({ success: false, message: "Organization not found" });
//     }

//     if (organization.onboardingStatus === "submitted") {
//       return res.status(403).json({
//         succees: false,
//         message: "Submitted organization cannot be modified"
//       });
//     }

//     Object.assign(organization, payload);

//     organization.currentStep = step;
//     organization.lastSavedAt = new Date();

//     if (!organization.completedSteps.includes(step)) {
//       organization.completedSteps.push(step)
//     }

//     organization.completionPercentage = Math.min(step * 20, 100);

//     await organization.save({ validateBeforeSave: false });

//     res.status(200).json({
//       success: true,
//       message: "Draft saved successfully",
//       data: organization
//     })
//   } catch (error) {
//     res.status(500).json({ success: false, message: error.message })
//   }
// }



   // UPLOAD DOCUMENTS (INCREMENTAL)

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

   // FINAL SUBMISSION (STRICT VALIDATION)
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