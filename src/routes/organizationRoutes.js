import express from 'express';
import { upload } from '../middlewares/multer.js';
import {
    createOrganization,
    getOrganizationByClientId,
    updateOrganization,
    deleteOrganization,
    verifyOrganizationManually,
    getOrganizationVerificationStatus
} from '../controllers/organizationController';
import { apiKeyAuth } from '../middlewares/apiKeyAuth.js';

const organizationRoutes = express.Router();

// Create new organization (with file uploads)
organizationRoutes.post(
    '/', upload.fields([
        { name: 'certificateOfIncorporation', maxCount: 1 },
        { name: 'particularsOfDirectors', maxCount: 1 },
        { name: 'particularsOfShareholders', maxCount: 1 },
        { name: 'operatingLicence', maxCount: 1 }
    ]), 
    apiKeyAuth, createOrganization
);

// Get organization by clientId
organizationRoutes.get('/:clientId', apiKeyAuth, getOrganizationByClientId);

// Update organization info
organizationRoutes.put('/:id', apiKeyAuth, upload.any(), updateOrganization);

// Delete organization
organizationRoutes.delete('/:id', apiKeyAuth, deleteOrganization);

// Manual verification (admin marks as approved/rejected)
organizationRoutes.put('/verify/:id', apiKeyAuth, verifyOrganizationManually);

// Fetch verification status (used by frontend to check progress)
organizationRoutes.get('/status/:clientId', apiKeyAuth, getOrganizationVerificationStatus);

export default organizationRoutes