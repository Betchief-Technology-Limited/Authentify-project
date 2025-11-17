import express from 'express';
import { adminSignUp } from '../controllers/adminSignupController.js';
import { adminLogIn, adminLogout } from '../controllers/adminSigninControlller.js';
import { getCurrentAdmin } from '../controllers/getCurrentAdminController.js';
import { authOrApiKey } from '../middlewares/authOrApiKey.js';
import { verifyEmail } from '../controllers/verifySignupEmailController.js';
import { resendVerificationEmail } from '../controllers/verifySignupEmailResend.js';

const adminRouter = express.Router();

adminRouter.post('/admin/signup', adminSignUp);
adminRouter.post('/admin/login', adminLogIn);
adminRouter.post('/admin/logout', adminLogout);
adminRouter.get('/admin/verify-email', verifyEmail);
adminRouter.post('/admin/resend-verification', resendVerificationEmail);

// IMPORTANT: use authMiddleware then getCurrentAdmin so response is the admin object 
adminRouter.get('/admin/me', authOrApiKey, getCurrentAdmin);

export default adminRouter;
