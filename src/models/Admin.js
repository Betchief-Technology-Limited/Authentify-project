import mongoose from "mongoose";
import { userDB } from "../config/db.js";

const apiKeysSchema = new mongoose.Schema({
    publicKey: { type: String, default: null },
    secretKey: { type: String, default: null }
});

const adminSchema = new mongoose.Schema({
    firstName: { type: String, required: true },
    lastName: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    organization: { type: String, required: true },
    password: { type: String, required: true },
    terms: { type: Boolean, required: true },
    emailVerified: { type: Boolean, default: false },
    verificationToken: { type: String, default: null },
    verificationExpires: { type: Date, default: null },
    apiKeys: {
        test: apiKeysSchema,
        live: apiKeysSchema,
    },
    walletBalance: { type: Number, default: 0 }
},
    { timestamps: true, collection: 'auth' }

);

const Admin = userDB.model('Admin', adminSchema);

export default Admin;