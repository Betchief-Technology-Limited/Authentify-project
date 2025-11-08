import axios from "axios";
import crypto from 'crypto';
import Transaction from "../models/transaction.js";
import Admin from "../models/Admin.js";
import Wallet from "../models/wallet.js";
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
    baseURL: "https://api.paystack.co",
    headers: {
        Authorization: `Bearer ${PAYSTACK_SECRET}`,
        "Content-Type": "application/json"
    }
});

/**
 * STEP 1: Initialize Paystack Transaction
 * - Creates a pending Transaction in your DB (provider 'paystack')
 * - Calls Paystack /transaction/initialize with { email, amount(kobo), reference, metadata }
 * - Returns Paystack's { authorization_url, reference, access_code }
 */

export async function initTransaction({ email, adminId, amount, metadata = {} }) {
    // 1️⃣ Validate admin exists
    const admin = await Admin.findById(adminId)
    if (!admin) throw new Error("Admin not found");

    // 2️⃣ Create a local reference & DB record FIRST
    const reference = `fund_${adminId}_${Date.now()}`;

    await Transaction.create({
        admin: adminId,
        tx_ref: reference,
        amount: Number(amount),
        provider: "paystack",
        status: "pending",
        description: "wallet funding"
    });

    // 3️⃣ Inititalize on Paystack
    const { data } = await api.post("/transaction/initialize", {
        email,
        amount: Math.round(Number(amount) * 100), //Convert this to kobo
        currency: 'NGN',
        reference,
        metadata: { ...metadata, adminId: String(adminId) },
        // optional: callback_url if you want Paystack to redirect back to your FE
        // callback_url: "https://your-fe.com/wallet/confirmation"
    });
    return data; // { status, message, data: { authorization_url, access_code, reference } }
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

    // 1) Find your pending transaction
    const transaction = await Transaction.findOne({ tx_ref: reference });
    if (!transaction) throw new Error("Transaction not found");

    // 2) Verify with Paystack
    const verification = await verifyTransaction(reference);
    const payData = verification?.data;

    if (!payData || payData.status !== "success") {
        transaction.status = 'failed';
        await transaction.save();
        return { success: false, message: "Paystack payment not successful" };
    }


    // 3) Mark transaction success & store payload
    transaction.status = "successful";
    transaction.rawPayLoad = payData;
    await transaction.save();

    // 4) Credit wallet (use Paystack amount to be safe)
    const creditedAmount = Number(payData.amount) / 100; //converting from kobo
    let wallet = await Wallet.findOne({ admin: adminId });
    if (!wallet)
        wallet = await Wallet.create({
            admin: adminId,
            balance: 0,
            history: []
        });

    wallet.balance += creditedAmount
    wallet.history.push({
        type: "credit",
        amount: creditedAmount,
        description: "Wallet funding via Paystack"
    });
    await wallet.save();


    // 5) Ensure LIVE API keys exist
    const admin = await Admin.findById(adminId);
    if (!admin.apiKeys?.live.publicKey || !admin.apiKeys?.live.secretKey) {
        const liveKeys = generateApiKeys("live");
        admin.apiKeys.live = liveKeys;
        await admin.save();
    }
    return {
        success: true,
        message: "Wallet funded via Paystack",
        newBalance: wallet.balance,
        reference
    }
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
        // req.body is a Buffer due to express.raw
        const secret = process.env.PAYSTACK_SECRET_KEY;
        const raw = req.body;
        const signature = req.headers["x-paystack-signature"];
        const computed = crypto
            .createHmac("sha512", secret)
            .update(raw)
            .digest("hex");

        if (computed !== signature) {
            console.warn("🚫 Invalid Paystack webhook signature");
            return res.status(401).json({ success: false, message: "Invalid signature" });
        }

        const event = JSON.parse(raw.toString());
        const data = event?.data;
        if (!data?.reference) {
            return res.status(400).json({ success: false, message: "No reference provided" });
        }

        // We only care about successful card charges
        if (event.event === "charge.success" && data.status === "success") {
            const reference = data.reference;
            const adminId = data.metadata?.adminId; // passed at init

            if (!adminId) {
                console.warn("⚠️ Missing adminId in Paystack metadata");
                return res.status(400).json({ success: false, message: "Missing adminId in metadata" });
            }

            // Idempotency: if it was already credited, this will no-op
            await finalizePaystackFunding(adminId, reference);
        }

        return res.sendStatus(200);
    } catch (err) {
        console.error("💥 Paystack Webhook Error:", err);
        return res.status(500).json({ success: false, message: "Webhook processing failed" });
    }
};

/* =============== Tokenization (custom form) =============== */

/**
 * Tokenize a card using Paystack
 * @param {{number:string, expiry_month:string, expiry_year:string, cvv:string}}
 * @returns {{token:string}}
 */

export async function tokenizeCardWithPaystack({
    email,
    number,
    expiry_month,
    expiry_year,
    cvv
}) {
    const payload = {
        ...(email ? { email } : {}),
        card: { number, cvv, expiry_month, expiry_year }
    };

    const { data } = await api.post("/charge/tokenize", payload);

    if (!data?.status) {
        throw new Error(data?.message || "Paystack tokenization failed")
    }

    return { token: data.data.token };
}

/**
 * Charge via token (no redirect) + credit wallet + persist transaction
 * Creates a pending Transaction -> charges token -> credits wallet on success
 */

export async function chargePaystackTokenAndCreditWallet({
    adminId,
    email,
    token,
    amount,
    metadata = {}
}) {
    // 1) Ensure Admin exists
    const admin = await Admin.findById(adminId);
    if (!admin) throw new Error("Admin not found");

    const amt = Number(amount);
    if (!Number.isFinite(amt) || amt <= 0) throw new Error("Invalid amount")

    // 2) Create local reference + DB record (pending)
    const reference = `fund_${adminId}_${Date.now()}`;

    await Transaction.create({
        admin: adminId,
        tx_ref: reference,
        amount: amt,
        provider: "paystack",
        status: "pending",
        description: "wallet funding via Paystack token"
    });

    // 3) Charge using token
    const payload = {
        token,
        email,
        amount: Math.round(Number(amt) * 100), //kobo
        reference,
        currency: "NGN",
        metadata: { ...metadata, adminId: String(adminId) }
    };

    const { data } = await api.post("/charge/token", payload);

    // Handle Paystack response
    if (!data?.status) {
        // mark failed
        await Transaction.updateOne(
            { tx_ref: reference },
            { status: "failed", rawPayLoad: data }
        );
        return { success: false, message: data?.message || "Paystack charge failed", reference };
    }

    // Inspect cahrge object
    const charge = data.data;
    if (!charge || charge.status !== "success") {
        await Transaction.updateOne(
            { tx_ref: reference },
            { status: "failed", rawPayLoad: charge || data }
        );
        return { success: false, message: "Charge not successful", reference, data: charge }
    }

    // 4) Mark transaction success & store payload
    await Transaction.updateOne(
        { tx_ref: reference },
        { status: "successful", rawPayLoad: charge }
    );

    // 5) Credit wallet using amount returned from Paystack(safer)
    const creditedAmount = Number(charge.amount) / 100 //kobo => NGN
    let wallet = await Wallet.findOne({ admin: adminId });
    if (!wallet) {
        wallet = await Wallet.create({ admin: adminId, balance: 0, history: [] });
    }

    wallet.balance += creditedAmount;
    wallet.history.push({
        type: "credit",
        amount: creditedAmount,
        description: "Wallet funding via Paystack (token)"
    });
    await wallet.save();

    // 6) Ensure LIVE API keys exist
    if (!admin.apiKeys?.live.publicKey || !admin.apiKeys?.live.secretKey) {
        const liveKeys = generateApiKeys("live");
        admin.apiKeys.live = liveKeys;
        await admin.save();
    }

    return {
        success: true,
        message: "Wallet funded via Paystack token",
        newBalance: wallet.balance,
        reference,
        data: charge,
    };
}