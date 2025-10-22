import express from 'express';
import { verifyKyc, getKycRecordStatus } from '../controllers/kycController.js';
import { apiKeyAuth } from '../middlewares/apiKeyAuth.js';

const kycRouter = express.Router();

kycRouter.post('/verify', apiKeyAuth, verifyKyc);
kycRouter.post('/status/:tx_ref', apiKeyAuth, getKycRecordStatus);

export default kycRouter