import express from 'express';
import { submitHelpForm } from '../controllers/customerHelpController.js';
import { authMiddleware } from '../middlewares/jwtAuth.js';

const submitHelpRouter = express.Router();

submitHelpRouter.post('/help/submit', authMiddleware, submitHelpForm);

export default submitHelpRouter;