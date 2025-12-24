import mongoose from "mongoose";
import { userDB } from "../config/db.js";

const apiKeysSchema = new mongoose.Schema({
    publicKey: { type: String, default: null },
    secretHash: { type: String, default: null },
    createdAt: { type: Date, default: null },
    lastRotateedAt: { type: Date, default: null }
},
    { _id: false }
);

const adminSchema = new mongoose.Schema({
    firstName: { type: String, default: null },
    lastName: { type: String, default: null },
    companyName: { type: String, required: true },
    email: {
        type: String,
        required: true,
        unique: true,
        lowercase: true,
        trim: true
    },
    password: { type: String, required: true },
    terms: { type: Boolean, required: true },
    // Email verification
    emailVerified: { type: Boolean, default: false },
    verificationToken: { type: String, default: null },
    verificationExpires: { type: Date, default: null },

    // API keys
    apiKeys: {
        test: apiKeysSchema,
        live: apiKeysSchema,
    },

    // Reset passwords field
    resetPasswordToken: { type: String, default: null },
    resetPasswordExpires: { type: Date, default: null },

    walletBalance: { type: Number, default: 0 },

    lowBalanceNotified: { type: Boolean, default: false } // NEW
},
    { timestamps: true, collection: 'auth' }

);

const Admin = userDB.model('Admin', adminSchema);

export default Admin;