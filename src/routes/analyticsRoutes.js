import express from 'express';
import { serviceSummary, subserviceCounts } from '../controllers/analyticsController.js';
import { authOrApiKey } from '../middlewares/authOrApiKey.js';


const analyticsRouter = express.Router();

analyticsRouter.get('/services/:serviceKey/summary', authOrApiKey, serviceSummary);
analyticsRouter.get('/services/:serviceKey/subservices', authOrApiKey, subserviceCounts);

export default analyticsRouter;