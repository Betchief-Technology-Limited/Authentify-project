import mongoose from "mongoose";

const emailSchema = new mongoose.Schema({
    admin: { type: mongoose.Schema.Types.ObjectId, ref: 'Admin', required: true },
    from: { type: String, required: true },
    to: { type: String, required: true },
    subject: { type: String },
    body: { type: String },
    template: { type: mongoose.Schema.Types.ObjectId, ref: 'EmailTemplate' },
    status: { type: String, enum: ['pending', 'sent', 'failed'], default: 'pending' },
    provider: { type: String, enum:['smtp', 'mock', 'sendgrid'] },
    providerResponse: { type: Object },
    tx_ref: { type: String }, //transaction reference for billing
}, { timestamps: true });

const Email = mongoose.model('Email', emailSchema);
export default Email