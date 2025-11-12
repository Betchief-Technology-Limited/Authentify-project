import express from "express"
import { changePassword } from "../controllers/changePasswordController.js";
import { authMiddleware } from "../middlewares/jwtAuth.js";

const changePasswordRouter = express.Router();

changePasswordRouter.put('/password', authMiddleware, changePassword);

export default changePasswordRouter;