import mongoose from "mongoose";
import { serviceDB } from "../config/db.js";

const kycQuickVerificationSchema = new mongoose.Schema({
    admin: { type: mongoose.Schema.Types.ObjectId, ref: "Admin", required: true },

    // End-user being verified
    user: {
        identityNumber: { type: String, required: true },
        firstName: { type: String, required: true },
        middleName: { type: String },
        lastName: { type: String, required: true }
    },

    identityType: {
        type: String,
        enum: [
            "premium_nin",
            "virtual_nin",
            "slip_nin",
            "passport",
            "voter_card",
            "drivers_licence"
        ],
        required: true
    },

    reason: { type: String, default: "" },
    cost: { type: Number, required: true },

    status: {
        type: String,
        enum: ["pending", "verified", "failed"],
        default: "pending"
    },

    tx_ref: { type: String, required: true, index: { unique: true } },

    providerResponse: { type: Object, default: {} },

    // idempotency key(client can provide)
    requestId: { type: String, index: true }
},
    {
        timestamps: true,
        collection: "kyc_quick_verification"
    }
);

const kycQuickVerificationRequest = serviceDB.model("KycQuickVerification", kycQuickVerificationSchema);

export default kycQuickVerificationRequest;