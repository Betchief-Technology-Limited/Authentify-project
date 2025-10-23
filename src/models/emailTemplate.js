import mongoose from "mongoose";
import { userDB } from "../config/db.js";

const emailTemplateSchema = new mongoose.Schema({
    admin: { type: mongoose.Schema.Types.ObjectId, ref: 'Admin', required: true },
    name: { type: String, required: true },
    subject: { type: String, required: true },
    body: { type: String, required: true },
    description: { type: String }
}, { timestamps: true });

const EmailTemplate = userDB.model('EmailTemplate', emailTemplateSchema);

export default EmailTemplate;