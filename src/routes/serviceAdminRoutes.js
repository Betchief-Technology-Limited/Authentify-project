import express from 'express';
import {
    registerServiceAdmin,
    loginServiceAdmin,
    logoutServiceAdmin,
    getAllOrganizations,
    updateOrganizationStatus
} from '../controllers/serviceAdminController.js';
import { serviceAdminAuth } from '../middlewares/serviceAdminAuth.js';

const serviceAdminRouter = express.Router();


// =====================================
// PUBLIC ROUTES (for initial setup & login)
// =====================================

// Register Service Admin (Only once)
serviceAdminRouter.post('/register', registerServiceAdmin);

// Login service admin
serviceAdminRouter.post('/login', loginServiceAdmin);

// Logout service admin
serviceAdminRouter.post('/logout', logoutServiceAdmin)



// =====================================
// PROTECTED ROUTES (for Service Provider Admin only)
// =====================================

// Get all submitted organizations
serviceAdminRouter.get('/organizations', serviceAdminAuth, getAllOrganizations);

// Verify or reject organization
serviceAdminRouter.patch('/organization/:id/status', serviceAdminAuth, updateOrganizationStatus);

export default serviceAdminRouter;