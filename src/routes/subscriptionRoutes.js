import express from 'express';
import { apiKeyAuth } from '../middlewares/apiKeyAuth.js';
import { subscribeService, unsubscribeService, getActiveSubscriptions } from '../controllers/subscriptionController.js';

const subscriptionRouter = express.Router();

subscriptionRouter.post('/subscribe', apiKeyAuth, subscribeService);
subscriptionRouter.post('/unsubscribe', apiKeyAuth, unsubscribeService);
subscriptionRouter.get('/active', apiKeyAuth, getActiveSubscriptions);

export default subscriptionRouter