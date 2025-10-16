import mongoose, { mongo } from 'mongoose';

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
        reuired: true
    },
    cost: { type: Number, required: true },
    status: {
        type: String,
        enum: ["pending", "verified", "failed"]
    },
    responseData: { type: Object },// stores API 
    providerResponseCode: { type: String },
    tx_ref: { type: String, unique: true },
    description: { type: String }
}, 
{ timestamps: true }
);

const Kyc = mongoose.model('Kyc', kycSchema);
export default Kyc