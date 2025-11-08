import {
    // 🔹 Flutterwave
    verifyFlutterwavePayment,
    initiateFlutterwavePayment,
    handleFlutterwaveWebhook,

    // 🔹 Paystack (standard + tokenized)
    initTransaction,
    finalizePaystackFunding,
    handlePaystackWebhook,
    tokenizeCardWithPaystack,
    chargePaystackTokenAndCreditWallet
} from "../services/paymentService.js"


/* =====================================================
   🟢 FLUTTERWAVE CONTROLLERS
   ===================================================== */

// STEP 1: Initiate payment
export const paymentInit = async (req, res) => {
    try {
        const { amount } = req.body;
        const adminId = req.admin._id //this comes from jwtAuth middleware

        if (!amount || amount <= 0) {
            return res.status(400).json({ success: false, message: 'Invalid amount' });
        }

        const { paymentUrl, tx_ref } = await initiateFlutterwavePayment(adminId, amount);

        // ✅ Return a clean response
        res.json({
            success: true,
            message: 'Payment initiated',
            paymentUrl, // <-- frontend will open this
            tx_ref,
            amount
        });
    } catch (error) {
        console.error('Payment init error:', error.message);
        res.status(500).json({ success: false, message: error.message })
    }
}

// STEP: Verify payment
export const paymentVerification = async (req, res) => {
    try {
        const { tx_ref } = req.params;
        if (!tx_ref) {
            return res.status(400).json({ succes: false, message: 'tx_ref is required' });
        }

        const result = await verifyFlutterwavePayment(tx_ref);

        res.json({
            success: result.success,
            message: result.message,
            newBalance: result.newBalance || 0,
            transaction: result.transaction || null
        });
    } catch (error) {
        console.error("Payment verify error:", error.message);
        res.status(500).json({ success: false, message: error.message });
    }
};

// handle webhook 
export const flutterwaveWebhook = async (req, res) => {
    await handleFlutterwaveWebhook(req, res);
}



/* =====================================================
   💳 PAYSTACK CONTROLLERS (Standard + Tokenized)
   ===================================================== */


// STEP 1️⃣ – Initialize Paystack payment
export const initializePaystackPayment = async (req, res) => {
    try {
        const { amount } = req.body;
        const adminId = req.admin?._id;
        const email = req.admin?.email;
        // console.log(adminId);
        // const adminId = "6900049b75db258e6cfab356"; // your test admin _id
        // const email = "caroline.mato1@gmail.com";

        if (!adminId || !email) {
            return res.status(401).json({ success: false, message: "Unathourized: admin missing" });
        }

        if (!amount || Number(amount) <= 0) {
            return res.status(400).json({ success: false, message: "Invalid amount" })
        }

        // For debugging purpose. It will be removed before final production 
        console.log("💳 Initializing Paystack payment for:", {
            adminId,
            email,
            amount,
        });

        //   Pass ONE object(service expects an object)
        const initRes = await initTransaction({
            adminId,
            email,
            amount,
            metadata: { adminId: String(adminId), purpose: "wallet_topup" }
        });


        // 🧾 Log full Paystack response for debugging (optional)
        console.log("✅ Paystack Initialize Response:", JSON.stringify(initRes, null, 2));

        if (!initRes || !initRes.status) {
            throw new Error(initRes?.message || "Failed to initialize Paystack transaction");
        }


        return res.status(200).json({
            success: true,
            message: "Paystack transaction initialized",
            data: {
                reference: initRes.data.reference,
                authorization_url: initRes.data.authorization_url,
                email
            }  // send authorization_url + reference to the frontend
        });
    } catch (err) {
        console.error("💥 Paystack Init Error:", err.message);
        res.status(500).json({ success: false, message: err.message })
    }
}

// STEP 2️⃣ – Confirm Paystack payment (after frontend callback)
export const confirmPaystackPayment = async (req, res) => {
    try {
        const { reference } = req.body;
        const adminId = req.admin?._id;

        if (!adminId || !reference) {
            return res.status(400).json({ success: false, message: "adminId and reference required" });
        }

        const result = await finalizePaystackFunding(adminId, reference);
        res.status(200).json(result);
    } catch (err) {
        console.error("💥 Paystack Confirm Error:", err.message);
        res.status(500).json({ success: false, message: err.message });
    }
};

// STEP 3️⃣ – Handle Paystack webhook (server-to-server)
export const paystackWebhook = async (req, res) => {
    await handlePaystackWebhook(req, res)
};





/* =====================================================
   🔐 PAYSTACK TOKENIZATION (Custom card flow)
   ===================================================== */
/**
 * STEP A: Tokenize card (server-side, PCI-safe in your setup)
 * Expects: { cardNumber, expiryMonth, expiryYear, cvv }
 * Returns: { token }
 */

export const paystackTokenize = async (req, res) => {
    try {
        const { cardNumber, expiryMonth, expiryYear, cvv } = req.body;
        if (!cardNumber || !expiryMonth || !expiryYear || !cvv) {
            return res.status(400).json({ success: false, message: "Missing card fields" });
        }

        const { token } = await tokenizeCardWithPaystack({
            number: String(cardNumber).replace(/\s+/g, ""),
            expiry_month: String(expiryMonth).padStart(2, "0"),
            expiry_year:
                String(expiryYear).length === 2
                    ? `20${expiryYear}`
                    : String(expiryYear),
            cvv: String(cvv)
        });

        return res.status(200).json({ success: true, token })
    } catch (err) {
        console.error("💥 Paystack Tokenize Error:", err.message);
        return res.status(500).json({ success: false, message: err.message })
    }
}

/**
 * STEP B: Charge using token (no redirect)
 * Expects: { token, amount }
 * Uses req.admin for { _id, email }
 * Returns: { success, message, newBalance, reference, data }
 */

export const paystackChargeToken = async (req, res) => {
    try {
        const adminId = req.admin?._id;
        const email = req.admin?.email;
        const { token, amount } = req.body;

        if (!adminId || !email) {
            return res.status(401).json({ success: false, message: "Unathorized: admin missing" });
        }

        if (!token || !amount || Number(amount) <= 0) {
            return res.status(400).json({ success: false, message: "token and valid amount are required" })
        }

        const result = await chargePaystackTokenAndCreditWallet({
            adminId,
            email,
            token,
            amount: Number(amount),
            metadata: { adminId: String(adminId), purpose: "wallet_topup_token" }
        });

        return res.status(200).json(result)
    } catch (err) {
        console.error("💥 Paystack Charge-Token Error:", err.message);
        return res.status(500).json({ success: false, message: err.message })
    }
}