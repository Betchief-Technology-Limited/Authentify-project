import express from 'express';
import { getWallet, rechargeWallet } from '../controllers/walletController.js';
// import { apiKeyAuth } from '../middleware/apiKeyAuth.js';
import { authOrApiKey } from '../middleware/authOrApiKey.js';

const walletRouter = express.Router();

walletRouter.get('/', authOrApiKey, getWallet);
walletRouter.post('/recharge', authOrApiKey, rechargeWallet);

export default walletRouter;