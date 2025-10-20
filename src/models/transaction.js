import mongoose from "mongoose";

const transactionSchema = new mongoose.Schema({
    admin: { type: mongoose.Schema.Types.ObjectId, ref: 'Admin', required: true },
    tx_ref: { type: String, required: true, unique: true },
    amount: { type: Number, required: true },
    status: { type: String, enum: ['pending', 'successful', 'failed'], default: 'pending'},
    provider: { type: String, enum: [
        'flutterwave', //wallet funding
        'paystack', //future payment option
        'telegram', //Telegram OTP
        'whatsapp', //Whatsapp OTP
        'mobishastra', //SMS OTP
        'kyc', //any KYC verification
        'email_service' //email notification
    ], required: true },
    description: { type: String },
    rawPayLoad: { type: Object }
}, { timestamps: true });

const Transaction = new mongoose.model('Transaction', transactionSchema);
export default Transaction