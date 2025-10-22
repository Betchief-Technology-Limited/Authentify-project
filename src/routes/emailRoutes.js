import express from 'express';
import { apiKeyAuth } from '../middlewares/apiKeyAuth.js';
import { sendEmailController } from '../controllers/emailController.js';

const emailRouter = express.Router();

// create/update template (protected)
// router.post('/template', apiKeyAuth, createTemplateController);

// send email (protected)
emailRouter.post('/send', apiKeyAuth, sendEmailController);

export default emailRouter;
