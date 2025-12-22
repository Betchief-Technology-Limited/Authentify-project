import express from "express";
import { upload } from "../middlewares/multer.js";
import {
    createOrGetOrganizationDraft,
    saveOrganizationDraft,
    uploadOrganizationDocuments,
    submitOrganization,
    getOrganizationByClientId,
    verifyOrganizationManually,
    getOrganizationVerificationStatus
} from "../controllers/organizationController.js";

const organizationRouter = express.Router();

/* ====================================================
   CLIENT ONBOARDING FLOW
==================================================== */

/**
 * Start onboarding / get existing draft
 * auto-fills registeredName from signup
 */

organizationRouter.post("/draft", createOrGetOrganizationDraft);


/**
 * Save progress (auto-save / "I'll do this later")
 */
organizationRouter.patch("/draft/:id", saveOrganizationDraft)

/**
 * Upload documents incrementally
 */
organizationRouter.post(
    "/draft/:id/documents",
    upload.fields([
        { name: "certificateOfIncorporation", maxCount: 1 },
        { name: "directorsId", maxCount: 1 },
        { name: "shareholdersParticulars", maxCount: 1 },
        { name: "operatingLicence", maxCount: 1 }
    ]),
    uploadOrganizationDocuments
);

/**
 * Final submission (locks record, runs validation)
 */
organizationRouter.post("/submit/:id", submitOrganization)


/* ====================================================
   CLIENT DASHBOARD
==================================================== */

/**
 * Resume onboarding / fetch organization
 */
organizationRouter.get(
    "/client/:clientId",
    getOrganizationByClientId
);

/**
 * Verification status (dashboard badge)
 */
organizationRouter.get(
    "/status/:clientId",
    getOrganizationVerificationStatus
);

/* ====================================================
   ADMIN ACTIONS
==================================================== */

/**
 * Manual verification (approve / reject)
 */
organizationRouter.patch(
    "/verify/:id",
    verifyOrganizationManually
);
export default organizationRouter;









































































// import express from 'express';
// import { upload } from '../middlewares/multer.js';
// import {
//     createOrganization,
//     getOrganizationByClientId,
//     updateOrganization,
//     deleteOrganization,
//     verifyOrganizationManually,
//     getOrganizationVerificationStatus,
// } from '../controllers/organizationController.js';


// const organizationRouter = express.Router();

// // Create new organization (with file uploads)
// organizationRouter.post(
//     '/',
//     upload.fields([
//         { name: 'certificateOfIncorporation', maxCount: 1 },
//         { name: 'particularsOfDirectors', maxCount: 1 },
//         { name: 'particularsOfShareholders', maxCount: 1 },
//         { name: 'operatingLicence', maxCount: 1 }
//     ]),
//     createOrganization
// );

// // Get organization by clientId
// organizationRouter.get('/:clientId', getOrganizationByClientId);

// //  Update organization info (optional re-uploads)
// organizationRouter.put(
//     "/:id",
//     upload.fields([
//         { name: "certificateOfIncorporation", maxCount: 1 },
//         { name: "particularsOfDirectors", maxCount: 1 },
//         { name: "particularsOfShareholders", maxCount: 1 },
//         { name: "operatingLicence", maxCount: 1 },
//     ]),
//     updateOrganization
// );

// // Delete organization
// organizationRouter.delete('/:id', deleteOrganization);

// // check verification status (used by frontend to check progress. For client dashboard)
// organizationRouter.get('/status/:clientId', getOrganizationVerificationStatus);

// // Manual verification status (admin marks as approved/rejected)
// organizationRouter.patch('/verify/:id', verifyOrganizationManually);


// export default organizationRouter