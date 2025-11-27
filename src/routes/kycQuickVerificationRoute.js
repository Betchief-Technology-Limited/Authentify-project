import express from 'express';
import { authMiddleware } from '../middlewares/jwtAuth.js';
import { quickVerification } from '../controllers/kycQuickVerificationController.js';

const kycQuickVerifcationRouter = express.Router();

kycQuickVerifcationRouter.post('/quick/single', authMiddleware, quickVerification);

export default kycQuickVerifcationRouter;