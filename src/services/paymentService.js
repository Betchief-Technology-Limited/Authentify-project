import Transaction from "../models/transaction.js";
import Admin from "../models/Admin.js";
import Wallet from "../models/wallet.js";
import axios from "axios";
import crypto from 'crypto'
import { generateApiKeys } from "../utils/apiKeyGenerator.js";

//First step: Initiate payment and save transaction
/**
 * STEP 1: INITIATE FLUTTERWAVE PAYMENT
 * - Creates a new pending transaction
 * - Returns a payment link for frontend redirect
 */
export const initiateFlutterwavePayment = async (adminId, amount) => {
    const admin = await Admin.findById(adminId);
    if (!admin) throw new Error('Admin not found')

    const tx_ref = `fund_${adminId}_${Date.now()}`;

    // Save the transaction in DB(status = pending)
    await Transaction.create({
        admin: adminId,
        tx_ref,
        amount,
        provider: 'flutterwave',
        status: 'pending',
        description: 'Wallet funding'
    });

    // Call Flutterwave API

    const resp = await axios.post(
        `${process.env.FLW_BASE_URL}/payments`,
        {
            tx_ref,
            amount,
            currency: 'NGN',
            redirect_url: 'http://localhost:5173/wallet/confirmation',
            customer: {
                email: admin.email,
                name: `${admin.firstName} ${admin.lastName}`
            },
            payment_options: 'card, ussd, banktransfer'
        },
        {
            headers: { Authorization: `Bearer ${process.env.FLW_SECRET_KEY}` }
        }
    );

    return {
        paymentUrl: resp.data.data.link,
        tx_ref
    }
}
/**
 * 
 *STEP 2: verify flutterwave payment
 */

// Verify Flutterwave payment
export const verifyFlutterwavePayment = async (tx_ref) => {
    const transaction = await Transaction.findOne({ tx_ref });
    if (!transaction) throw new Error('Transaction not found');

    // Verify payment from Flutterwave
    console.log("🔍 Verifying Flutterwave payment:", tx_ref);
    let resp;
    try {
        resp = await axios.get(
            `${process.env.FLW_BASE_URL}/transactions/verify_by_reference?tx_ref=${tx_ref}`,
            { headers: { Authorization: `Bearer ${process.env.FLW_SECRET_KEY}` } }
        );
    } catch (err) {
        console.error("❌ Flutterwave verify failed:", err.response?.data || err.message);
        throw new Error("Flutterwave verification request failed");
    }
    console.log("🌍 URL:", `${process.env.FLW_BASE_URL}/transactions/verify_by_reference?tx_ref=${tx_ref}`);

    const flwData = resp.data.data;
    if (!flwData) throw new Error("Invalid Flutterwave response");

    // ✅ Successful Payment
    if (flwData.status === 'successful') {
        transaction.status = 'successful';
        await transaction.save();

        // ✅ Update wallet balance
        let wallet = await Wallet.findOne({ admin: transaction.admin });
        if (!wallet) {
            wallet = await Wallet.create({
                admin: transaction.admin,
                balance: 0,
                history: []
            })
        }

        wallet.balance += transaction.amount;
        wallet.history.push({
            type: 'credit',
            amount: transaction.amount,
            description: 'Wallet funding via Flutterwave'
        });

        await wallet.save();

        // ✅ Generate LIVE keys if not yet created
        const admin = await Admin.findById(transaction.admin)
        if (!admin.apiKeys.live.publicKey || !admin.apiKeys.live.secretKey) {
            const liveKeys = generateApiKeys("live");
            admin.apiKeys.live = liveKeys;
            await admin.save();
        }

        return {
            success: true,
            message: 'Payment verified and wallet funded',
            newBalance: wallet.balance
        }
    } else {
        transaction.status = 'failed';
        await transaction.save();

        return { success: false, message: 'Payment not successful' }
    }
}

/**
 * STEP 3: HANDLE WEBHOOK (optional)
 * - Used when Flutterwave sends automatic transaction confirmation
 */

export const handleFlutterwaveWebhook = async (req, res) => {
    try {
        const secretHash = process.env.FLW_WEBHOOK_SECRET;
        const signature = req.headers['verif-hash']

        // Validate webhook source
        if (!signature || signature !== secretHash) {
            return res.status(401).json({ success: false, message: 'Unauthorized webhook' })
        }

        const payload = req.body;
        const { tx_ref, status, amount } = payload.data;

        const transaction = await Transaction.findOne({ tx_ref });

        if (!transaction) {
            return res.status(404).json({ success: false, message: 'Transaction not found' });
        }

        // Process only successful payments
        if (status === 'successful' && transaction.status !== 'successful') {
            transaction.status = 'successful';
            await transaction.save();

            // Credit wallet
            let wallet = await Wallet.findOne({ admin: transaction.admin });
            if (!wallet) {
                wallet = await Wallet.create({ admin: transaction.admin, balance: 0, history: [] });
            }

            wallet.balance += amount;
            wallet.history.push({
                type: "credit",
                amount,
                description: "Wallet funding via Flutterwave (webhook)"
            });
            await wallet.save();
        }

        // ✅ Generate LIVE keys if not yet created
        const admin = await Admin.findById(transaction.admin);
        if (!admin.apiKeys.live.publicKey || !admin.apiKeys.live.secretKey) {
            const liveKeys = generateApiKeys("live");
            admin.apiKeys.live = liveKeys;
            await admin.save();
        }

        return res.status(200).json({ success: true, message: "Webhook processed" });

    } catch (err) {
        console.error("Webhook error:", err.message);
        return res.status(500).json({ success: false, message: "Webhook handling failed" });
    }
}


/* ============================================
   🔹 PAYSTACK INTEGRATION (New Section)
   ============================================ */

const PAYSTACK_SECRET = process.env.PAYSTACK_SECRET_KEY;
const api = axios.create({
    baseURL: "https:/api.paystack.co",
    headers: {
        Authorization: `Bearer ${PAYSTACK_SECRET}`,
        "Content-Type": "application/json"
    }
});

/**
 * STEP 1: Initialize Paystack Transaction
 * This returns a transaction reference and authorization URL
 * Your frontend can embed Paystack’s inline form for card entry.
 */

export async function initTransaction({ email, amount, reference, metadata = {} }) {
    const { data } = await api.post("/transaction/initialize", {
        email,
        amount: Math.round(Number(amount) * 100), //Convert this to kobo
        reference,
        metadata
    });
    return data; // { status, message, data: { reference, authorization_url, ... } }
}

/**
 * STEP 2: Verify Paystack Transaction
 * Called after payment or via webhook
 */

export async function verifyTransaction(reference) {
    const { data } = await api.get(`/transaction/verify/${reference}`);
    return data; // { status, data: { status: 'success', amount, currency, ... } }
}

// Fund Wallet After Paystack Verification
export async function finalizePaystackFunding(adminId, reference) {
    const transaction = await Transaction.findOne({ tx_ref: reference });

    if (!transaction) throw new Error("Transaction not found");

    const verification = await verifyTransaction(reference);
    const payData = verification.data;

    if (!payData || payData.status !== "success") {
        transaction.status = 'failed';
        await transaction.save();
        return res.status(400).json({ success: false, message: "Paystack payment not successful" });
    }

    transaction.status = "successful";
    transaction.rawPayLoad = payData;
    await transaction.save();

    let wallet = await Wallet.findOne({ admin: adminId });
    if (!wallet)
        wallet = await Wallet.create({
            admin: adminId,
            balance: 0,
            history: []
        });

    wallet.balance += transaction.amount;
    wallet.history.push({
        type: "credit",
        amount: transaction.amount,
        description: "Wallet funding via Paystack"
    });
    await wallet.save();

    const admin = await Admin.findById(adminId);
    if (!admin.apiKeys?.live.publicKey || !admin.apiKeys?.live.secretKey) {
        const liveKeys = generateApiKeys("live");
        admin.apiKeys.live = liveKeys;
        await admin.save();
    }
    return res.status(200).json({
        success: true,
        message: "Wallet funded via Paystack",
        newBalance: wallet.balance
    })
}

/**
 * STEP 3: Handle Paystack Webhook (Server → Server Notification)
 * --------------------------------------------------------------
 * Paystack sends a POST request to your webhook URL (e.g. /api/payments/paystack/webhook)
 * whenever a transaction event occurs.
 * 
 * This handler:
 * - Verifies the HMAC SHA512 signature using PAYSTACK_SECRET_KEY
 * - Validates event type and reference
 * - Calls finalizePaystackFunding() to credit wallet if successful
 */

export const handlePaystackWebhook = async (req, res) => {
    try {
        const secret = process.env.PAYSTACK_SECRET_KEY;
        const hash = crypto
            .createHmac("sha512", secret)
            .update(JSON.stringify(req.body))
            .digest("hex");

        const signature = req.headers["x-paystack-signature"];

        // Verify webhook authenticity
        if (!signature || hash !== signature) {
            console.warn("🚫 Invalid Paystack webhook signature");
            return res.status(401).json({ success: false, message: "Unauthorized webhook" })
        }

        const event = req.body;
        const { reference, status } = event.data;

        // Only handle successful charges
        if (event.event === "charge.success" && status === "success") {
            console.log("✅ Paystack webhook: charge.success for ref:", reference);
            // Paystack allows embedding metadata — adminId can be passed from frontend init
            const adminId = event.data.metadata?.adminId;

            if (!adminId) {
                console.warn("⚠️ Missing adminId in Paystack metadata. Cannot auto-credit wallet.");
                return res.status(400).json({
                    success: false,
                    message: "Missing adminId in metadata"
                });
            }

            await finalizePaystackFunding(adminId, reference);
        }

        res.status(200).json({ success: true, message: "Webhook processed successfully" })
    } catch (err) {
        console.error("💥 Paystack Webhook Error:", err.message);
        res.status(500).json({ success: false, message: "Webhook processing failed" });
    }
}