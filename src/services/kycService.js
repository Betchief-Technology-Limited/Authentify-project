import Kyc from "../models/kyc.js";
import Transaction from "../models/transaction.js";
import Wallet from "../models/wallet.js";
import { getIO } from "../config/socket.js";

const KYC_COSTS = {
    premium_nin: parseFloat(process.env.KYC_COST_PREMIUM_NIN || '10'),
    virtual_nin: parseFloat(process.env.KYC_COST_VIRTUAL_NIN || '12'),
    slip_nin: parseFloat(process.env.KYC_COST_SLIP_NIN || '5'),
    passport: parseFloat(process.env.KYC_COST_PASSPORT || '17'),
    voter_card: parseFloat(process.env.KYC_COST_VOTER_CARD || '17'),
    drivers_licence: parseFloat(process.env.KYC_COST_DRIVERS_LICENCE || '40')
}

export const processKycVerification = async (admin, userIdentifier, type) => {
    if (!KYC_COSTS[type]) {
        throw new Error('Invalid KYC type selected.');
    }

    const cost = KYC_COSTS[type];

    // check wallet balance
    const wallet = await Wallet.findOne({ admin: admin._id });
    if (!wallet || wallet.balance < cost) {
        throw new Error('Insufficient wallet balance. Please top-up to continue.')
    }

    const tx_ref = `kyc_${admin._id}_${Date.now()}`;

    const kycRecord = await Kyc.create({
        admin: admin._id,
        userIdentifier,
        type,
        cost,
        status: 'pending',
        tx_ref,
        description: `kyc VERIFICATION (${type})`
    });

    const transaction = await Transaction.create({
        admin: admin._id,
        tx_ref,
        amount: cost,
        status: 'pending',
        provider: 'kyc',
        serviceType: "kyc",
        subservice: type,
        description: `KYC verification (${type})`
    });

    // Mock verification success (until 3rd- party API integration)

    const mockResponse = {
        verified: true,
        message: 'Mock verification success',
        reference: tx_ref
    };
    transaction.status = 'successful';
    transaction.rawPayLoad = mockResponse
    await transaction.save();

    wallet.balance -= cost;
    wallet.history.push({
        type: 'debit',
        amount: cost,
        description: `KYC verification (${type})`
    });

    await wallet.save();

    // 📊 Emit live analytics
    try {
        getIO().emit("kyc_activity", {
            service: type,
            admin: admin._id,
            amount: cost,
            timestamp: new Date(),
            message: `KYC verification (${type}) completed`,
        });

    } catch (err) {
        console.log("Socket not ready, continuing...");
    }

    return { kycRecord, transaction }

};

export const getKycStatus = async (tx_ref) => {
    const record = await Kyc.findOne({ tx_ref });
    if (!record) throw new Error('KYC record not found');
    return record;
}