import mongoose from "mongoose";

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
    apiKeys: {
        test: apiKeysSchema,
        live: apiKeysSchema,
    },
    walletBalance: { type: Number, default: 0 },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now }
},
{
    timestamps: true,
    collection: 'auth'
}
);

const Admin = new mongoose.model('Admin', adminSchema);

export default Admin;