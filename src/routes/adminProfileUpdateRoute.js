import express from 'express'
import { authMiddleware } from '../middlewares/jwtAuth.js';
import { updateAdminProfile } from '../controllers/adminProfileUpdateController.js';

const adminProfileRouter = express.Router();

adminProfileRouter.put('/update', authMiddleware, updateAdminProfile);

export default adminProfileRouter;