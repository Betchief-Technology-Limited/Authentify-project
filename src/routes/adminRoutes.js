import express from 'express';
import { adminSignUp } from '../controllers/adminSignupController.js';
import { adminLogIn, adminLogout } from '../controllers/adminSigninControlller.js';
import { getCurrentAdmin } from '../controllers/getCurrentAdminController.js';
import { authMiddleware } from '../middleware/jwtAuth.js';

export const adminRouter = express.Router();

adminRouter.post('/admin/signup', adminSignUp);
adminRouter.post('/admin/login', adminLogIn);
adminRouter.post('/admin/logout', adminLogout);

// IMPORTANT: use authMiddleware then getCurrentAdmin so response is the admin object 
adminRouter.get('/admin/me', authMiddleware, getCurrentAdmin);
