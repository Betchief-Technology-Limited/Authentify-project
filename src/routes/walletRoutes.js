import express from 'express';
import { getWallet, rechargeWallet, getWalletSummary } from '../controllers/walletController.js';
// import { apiKeyAuth } from '../middleware/apiKeyAuth.js';
import { authOrApiKey } from '../middlewares/authOrApiKey.js';

const walletRouter = express.Router();

walletRouter.get('/', authOrApiKey, getWallet);
walletRouter.post('/recharge', authOrApiKey, rechargeWallet);

walletRouter.get('/summary', authOrApiKey, getWalletSummary)

export default walletRouter;