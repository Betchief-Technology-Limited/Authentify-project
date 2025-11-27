import mongoose from "mongoose";
import Admin from "../models/Admin.js";
import Transaction from "../models/transaction.js";
import Wallet from "../models/wallet.js";
import { deduct, checkBalance } from "./walletService.js";
import SERVICE_COSTS from "../config/serviceCosts.js";
import crypto from 'crypto';
import kycQuickVerificationRequest from "../models/kycQuickVerification.js";
import { nimcVerifyAdapter } from "../utils/adapters/nimcAdapter.js";
import Subscription from "../models/subscription.js";

/**
 * Business logic for Quick Verification (single request)
 *
 * Responsibilities:
 * - Validate client subscription to requested subservice
 * - Check wallet balance (and optionally deduct cost)
 * - Create pending Transaction & KYC record
 * - Call provider adapter for the chosen identityType
 * - On provider success: mark transaction successful, credit/debit wallet, emit socket updates
 * - Ensure idempotency by requestId or tx_ref (no double charges)
 */


export async function processQuickVerificationRequest({
    clientId,
    identityType,
    user,
    reason,
    requestId
}) {
    //reqBody: { identityType, firstName, lastName, identityNumber, reason }
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        if (!clientId) throw new Error("clientId is required");
        if (!identityType || !SERVICE_COSTS[identityType]) throw new Error("Invalid identityType");

        const cost = SERVICE_COSTS[identityType];

        // Get admin + wallet
        const admin = await Admin.findById(clientId).session(session);
        if (!admin) throw new Error("Client not found");

        const wallet = await Wallet.findOne({ admin: clientId }).session(session);
        if (!wallet) throw new Error("Wallet not found");

        // Subscription check
        const subscribed = await Subscription.findOne({
            admin: clientId,
            serviceType: "kyc",
            subservice: identityType,
            active: true
        }).session(session);

        if (!subscribed) {
            return {
                success: false,
                message: `Client not subscribed to ${identityType}`
            }
        }

        // Idempotency Check 
        if (requestId) {
            const existing = await kycQuickVerificationRequest.findOne({ requestId }).session(session);

            if (existing) {
                if (existing.status === "verified") {
                    await session.commitTransaction();
                    return {
                        success: true,
                        message: "Already processed",
                        data: existing.providerResponse
                    };
                }
                if (existing.status === "pending") {
                    await session.commitTransaction();
                    return {
                        success: false, message: "Still processing"
                    }
                }
            }
        }

        // Check balance
        const hasBalance = await checkBalance(clientId, cost);
        if (!hasBalance) {
            await session.abortTransaction();
            return { success: false, message: "Insufficient wallet balance" }
        }

        // Generate tx_ref
        const txRef = `kyc_${clientId}_${Date.now()}_${crypto.randomBytes(3).toString("hex")}`;

        // Create Transaction
        await Transaction.create(
            [{
                admin: clientId,
                tx_ref: txRef,
                amount: cost,
                status: "pending",
                provider: "kyc",
                serviceType: "kyc",
                subservice: identityType,
                description: `Quick verification (${identityType})`
            }],
            { session }
        );

        // Create KYC Request
        const kycReq = await kycQuickVerificationRequest.create(
            [{
                admin: clientId,
                user,
                identityType,
                reason,
                tx_ref: txRef,
                cost,
                requestId
            }],
            { session }
        );

        // CALL PROVIDER
        if (["premium_nin", "virtual_nin", "slip_nin"].includes(identityType)) {
            providerResponse = await nimcVerifyAdapter.verifyNIN({
                identityType,
                identityNumber: user.identityNumber,
                firstName: user.firstName,
                lastName: user.lastName
            });
        } else {
            providerResponse = await nimcVerifyAdapter.verifyGeneric({
                identityType,
                identityNumber: user.identityNumber,
                firstName: user.firstName,
                lastName: user.lastName
            })
        }

        const success = providerResponse?.verified === true || providerResponse?.status === "success";

        if (!success) {
            await kycQuickVerificationRequest.findByIdAndDelete(
                kycReq[0]._id,
                { status: "failed", providerResponse },
                { session }
            );
            await Transaction.findOneAndUpdate(
                { tx_ref: txRef },
                { status: "failed", rawPayLoad: providerResponse },
                { session }
            )

            await session.commitTransaction();
            return { success: false, message: "Verification failed", data: providerResponse }
        }

        // Deduct cost
        await deduct(clientId, cost, `Quick KYC - ${identityType}`);

        // Update records to VERIFIED
        await Transaction.findOneAndUpdate(
            { tx_ref: txRef },
            { status: "successful", rawPayLoad: providerResponse },
            { session }
        );
        await kycQuickVerificationRequest.findByIdAndUpdate(
            kycReq[0]._id,
            { status: "verified", providerResponse },
            { session }
        );

        await session.commitTransaction();

        return {
            success: true,
            message: "Verification successful",
            data: providerResponse,
            reference: txRef
        }
    } catch (err) {
        await session.abortTransaction();
        console.error("processQuickVerification error:", err);
        return { success: false, message: err.message };
    } finally {
        session.endSession();
    }
}
