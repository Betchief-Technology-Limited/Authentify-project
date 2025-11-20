import mongoose from "mongoose";
import { userDB } from "../config/db.js";

const transactionSchema = new mongoose.Schema({
    admin: { type: mongoose.Schema.Types.ObjectId, ref: 'Admin', required: true },
    tx_ref: { type: String, required: true, unique: true },
    amount: { type: Number, required: true },
    status: { type: String, enum: ['pending', 'successful', 'tokenized', 'failed'], default: 'pending'},
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
    rawPayLoad: { type: Object },

    subservice: { type: String, default: null }, //"premium_nin", "slip_nin","sms"
    serviceType: { type: String, enum: ['kyc', 'otp', 'wallet_topup'], required: true } //"kyc", "otp", "email"

}, { timestamps: true });

const Transaction = userDB.model('Transaction', transactionSchema);
export default Transaction