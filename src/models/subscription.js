import mongoose, { mongo } from "mongoose";

const subscriptionSchema = new mongoose.Schema({
    admin: { type: mongoose.Schema.Types.ObjectId, ref: "Admin", required: true },
    serviceType: {
        type: String,
        enum: ["otp", "kyc", "email"],
        required: true
    },
    subservice: { type: String, required: true }, //e.g 'sms', 'whatsapp', 'premium_nin',
    active: { type: Boolean, default: true },
    costPerCall: { type: Number, required: true },
    subscribedAt: { type: Date, default: Date.now },
    unsubscribedAt: { type: Date }
}, { timestamps: true });

const Subscription = mongoose.model('Subscription', subscriptionSchema);

export default Subscription;