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
import { apiKeyAuth } from '../middlewares/apiKeyAuth.js';

const organizationRouter = express.Router();

// Create new organization (with file uploads)
organizationRouter.post(
    '/', upload.fields([
        { name: 'certificateOfIncorporation', maxCount: 1 },
        { name: 'particularsOfDirectors', maxCount: 1 },
        { name: 'particularsOfShareholders', maxCount: 1 },
        { name: 'operatingLicence', maxCount: 1 }
    ]), 
    apiKeyAuth, createOrganization
);

// Get organization by clientId
organizationRouter.get('/:clientId', apiKeyAuth, getOrganizationByClientId);

// Update organization info
organizationRouter.put('/:id', apiKeyAuth, upload.any(), updateOrganization);

// Delete organization
organizationRouter.delete('/:id', apiKeyAuth, deleteOrganization);

// Manual verification (admin marks as approved/rejected)
organizationRouter.put('/verify/:id', apiKeyAuth, verifyOrganizationManually);

// Fetch verification status (used by frontend to check progress)
organizationRouter.get('/status/:clientId', apiKeyAuth, getOrganizationVerificationStatus);

export default organizationRouter