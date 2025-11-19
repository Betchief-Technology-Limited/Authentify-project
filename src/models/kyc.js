import mongoose from 'mongoose';
import { userDB } from '../config/db.js';

const kycSchema = new mongoose.Schema({
    admin: { type: mongoose.Schema.Types.ObjectId, ref: 'Admin', required: true },
    userIdentifier: { type: String, required: true },// e.g NIN, Passport, Voter's card
    type: {
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
    cost: { type: Number, required: true },
    status: {
        type: String,
        enum: ["pending", "verified", "failed"],
        default: 'pending'
    },
    responseData: { type: Object },// stores API 
    providerResponseCode: { type: String },
    tx_ref: { type: String, unique: true },
    description: { type: String }
}, 
{ timestamps: true }
);

const Kyc = userDB.model('Kyc', kycSchema);
export default Kyc