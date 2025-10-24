import express from 'express';
import { upload } from '../middlewares/multer.js';
import {
    createOrganization,
    getOrganizationByClientId,
    updateOrganization,
    deleteOrganization,
    verifyOrganizationManually,
    getOrganizationVerificationStatus
} from '../controllers/organizationController.js';


const organizationRouter = express.Router();

// Create new organization (with file uploads)
organizationRouter.post(
    '/',
    upload.fields([
        { name: 'certificateOfIncorporation', maxCount: 1 },
        { name: 'particularsOfDirectors', maxCount: 1 },
        { name: 'particularsOfShareholders', maxCount: 1 },
        { name: 'operatingLicence', maxCount: 1 }
    ]),
    createOrganization
);

// Get organization by clientId
organizationRouter.get('/:clientId',getOrganizationByClientId);

// Update organization info
organizationRouter.put('/:id', upload.any(), updateOrganization);

// Delete organization
organizationRouter.delete('/:id', deleteOrganization);

// check verification status (used by frontend to check progress. For client dashboard)
organizationRouter.get('/status/:clientId', getOrganizationVerificationStatus);

// Manual verification status (admin marks as approved/rejected)
organizationRouter.patch('/verify/:id', verifyOrganizationManually);


export default organizationRouter