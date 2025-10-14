import mongoose from "mongoose";

const walletSchema = new mongoose.Schema({
    admin: { type: mongoose.Schema.Types.ObjectId, ref: 'Admin', required: true },
    balance: { type: Number, default: 0 },
    history: [
        {
          type: { type: String, enum: ['credit', 'debit'], required: true },
          amount: { type: Number, required: true },
          description: String,
          createdAt: { type: Date, default: Date.now }
        }
    ]
}, { timestamps: true });

export default mongoose.model('Wallet', walletSchema)
