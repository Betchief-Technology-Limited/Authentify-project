import mongoose from "mongoose";
import { serviceDB } from "../config/db.js";

const helpSchema = new mongoose.Schema({
    clientId: { type: mongoose.Schema.Types.ObjectId, ref: 'Client', required: false },

    firstName: { type: String, required: true },
    lastName: { type: String, required: true },
    companyName: { type: String, required: true },
    companyEmail: { type: String, required: true, lowercase: true, trim: true },
    subject: { type: String, required: true },
    description: { type: String, required: true },
    phoneNumber: { type: String, required: true },
    country: { type: String, required: true },
    agreedToTerms: { type: Boolean, required: true },

    // Extra feature
    status: {
        type: String,
        enum: ["pending", "answered"],
        default: "pending"
    },

    adminResponse: { type: String, default: "" },
    respondedAt: { type: Date },

    emailNotification: {
        sent: { type: Boolean, default: false },
        sentAt: { type: Date },
    },
},
    {
        timestamps: true,
        collection: 'help'
    }
);

const Help = serviceDB.model('Help', helpSchema);

export default Help;