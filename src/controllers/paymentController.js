import {
    // 🔹 Flutterwave
    verifyFlutterwavePayment,
    initiateFlutterwavePayment,
    handleFlutterwaveWebhook,

    // 🔹 Paystack (standard)
    initTransaction,
    finalizePaystackFunding,
    verifyTransaction,
    handlePaystackWebhook,

    // 🔹 Paystack (custom card + tokenized)
    tokenizeCardWithPaystack,
    submitPaystackOTP,
    chargePaystackTokenAndCreditWallet
} from "../services/paymentService.js"
import Transaction from "../models/transaction.js";
import Wallet from "../models/wallet.js";


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
   💳 PAYSTACK CONTROLLERS (Standard )
   ===================================================== */


// STEP 1️⃣ – Initialize Paystack payment
export const initializePaystackPayment = async (req, res) => {
    try {
        const { amount } = req.body;
        const adminId = req.admin?._id;
        const email = req.admin?.email;


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
            paymentUrl: initRes.data.authorization_url,
            tx_ref: initRes.data.reference
            // data: {
            //     reference: initRes.data.reference,
            //     authorization_url: initRes.data.authorization_url,
            //     email
            // }  // send authorization_url + reference to the frontend
        });
    } catch (err) {
        console.error("💥 Paystack Init Error:", err.message);
        res.status(500).json({ success: false, message: err.message })
    }
}

// STEP 2️⃣ – Confirm Paystack payment (manual confirmation not for polling)
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

// Step 3️⃣ - NEW: Poll endpoint for automatic frontend verification

export const verifyPaystackPaymentStatus = async (req, res) => {
    try {
        const { reference } = req.params;
        const adminId = req.admin?._id;

        if (!reference) {
            return res.status(400).json({
                success: false,
                message: "Reference is required"
            })
        }

        // Find transaction
        const tx = await Transaction.findOne({ tx_ref: reference });

        if (!tx) {
            return res.status(400).json({
                success: false,
                message: "Transaction not found"
            })
        }

        // 🟢 Webhook has already credited wallet
        if (tx.status === 'successful') {
            const wallet = await Wallet.findOne({ admin: adminId });
            return res.json({
                success: true,
                newBalance: wallet?.balance || 0,
                message: "Payment successful (via webhook)"
            });
        }

        // 🔴 Transaction failed
        if (tx.status === 'failed') {
            return res.json({
                success: false,
                message: 'not successful'
            })
        }

        // 🟡 Check paystack status BUT DO NOT CREDIT HERE
        const verification = await verifyTransaction(reference);
        const payData = verification?.data;

        // Still pending
        if (!payData || payData.status === 'pending') {
            return res.json({
                success: false,
                message: 'pending'
            })
        }

        // Paystack reports success BUT webhook has not arrived yet
        if (payData.status === 'success') {
            // DO NOT CREDIT HERE
            const wallet = await Wallet.findOne({ admin: adminId });
            return res.json({
                success: true,
                newBalance: wallet?.balance || 0,
                message: "Payment successful (awaiting webhook sync)"
            });
        }

        // if (payData.status === 'success') {
        //     const result = await finalizePaystackFunding(adminId, reference);
        //     return res.json(result)
        // }

        // Finally, handle failure
        tx.status = 'failed';
        await tx.save();

        return res.json({
            success: false,
            message: 'not successful'
        })
    } catch (err) {
        console.error("💥 Paystack Polling Error:", err.message);
        res.status(500).json({ success: false, message: err.message });
    }
}



// STEP 4️⃣ – Handle Paystack webhook (server-to-server)
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
        const { cardNumber, expiryMonth, expiryYear, cvv, card, amount } = req.body;

        const number = cardNumber || card?.number;
        const month = expiryMonth || card?.expiry_month;
        const year = expiryYear || card?.expiry_year;
        const code = cvv || card?.cvv;

        if (!number || !month || !year || !code)
            return res.status(400).json({ success: false, message: "Missing card fields" });

        if (!amount || Number(amount) <= 0)
            return res.status(400).json({ success: false, message: "Invalid amount" });

        const customerEmail = req.admin?.email;
        if (!customerEmail)
            return res.status(401).json({ success: false, message: "Unauthorized: admin email required" });

        const result = await tokenizeCardWithPaystack({
            email: customerEmail,
            number: String(number || "").replace(/\s+/g, ""),
            expiry_month: String(month).padStart(2, "0"),
            expiry_year: String(year).length === 2 ? `20${year}` : String(year),
            cvv: String(code),
            amount: Number(amount)
        });

        if (result.otp_required) {
            return res.status(200).json({
                success: true,
                otp_required: true,
                reference: result.reference,
                message: result.message
            });
        }

        const reference = `paystack_token_${req.admin._id}_${Date.now()}`;
        await Transaction.create({
            admin: req.admin._id,
            provider: "paystack",
            tx_ref: reference,
            amount: Number(amount),
            status: "tokenized",
            description: "Card tokenized (authorization_code)",
            rawPayLoad: result.raw || {},
            meta: {
                authorization_code: result.token || "",
                paystackCustomerEmail: result.customerEmail || customerEmail
            }
        });

        return res.status(200).json({
            success: true,
            otp_required: false,
            token: result.token,
            customerEmail: result.customerEmail || customerEmail,
            reference
        });
    } catch (err) {
        console.error("💥 Paystack Tokenize Error:", err.response?.data || err.message);
        return res.status(400).json({ success: false, message: err.message });
    }
};


// submit otp to paystack 
export const paystackSubmitOtp = async (req, res) => {
    try {
        const { otp, reference } = req.body;

        if (!otp || !reference)
            return res.status(400).json({ success: false, message: "OTP and reference required" });

        const result = await submitPaystackOTP({ otp, reference });

        const referenceId = `paystack_token_${req.admin._id}_${Date.now()}`;
        await Transaction.create({
            admin: req.admin._id,
            provider: "paystack",
            tx_ref: referenceId,
            amount: 0,
            status: "tokenized",
            description: "Card tokenized via OTP",
            rawPayLoad: result.raw,
            meta: { authorization_code: result.token, paystackCustomerEmail: result.customerEmail }
        });

        return res.status(200).json({
            success: true,
            token: result.token,
            customerEmail: result.customerEmail,
            reference: referenceId
        });
    } catch (err) {
        console.error("💥 Paystack OTP Error:", err.message);
        return res.status(500).json({ success: false, message: err.message });
    }
};


/**
 * STEP B: Charge using token (no redirect)
 * Expects: { token, amount }
 * Uses req.admin for { _id, email }
 * Returns: { success, message, newBalance, reference, data }
 */

export const paystackChargeToken = async (req, res) => {
    try {
        const adminId = req.admin?._id;
        const fallbackEmail = req.admin?.email;
        const { token, amount, email } = req.body;

        if (!adminId || !fallbackEmail) {
            return res.status(401).json({ success: false, message: "Unathorized: admin missing" });
        }

        if (!token || !amount || Number(amount) <= 0) {
            return res.status(400).json({ success: false, message: "token and valid amount are required" })
        }

        // Prefer the email provided by the frontend only if it exactly matches the admin's email.
        // Better: use email returned from tokenize endpoint (frontend should pass it back), or use fallbackEmail.
        const customerEmail = (email && email === fallbackEmail) ? email : fallbackEmail;

        console.log("🔹 AdminID:", adminId);
        console.log("🔹 Incoming email:", email);
        console.log("🔹 Fallback (admin) email:", fallbackEmail);
        console.log("🔹 Final email to charge:", customerEmail);


        const result = await chargePaystackTokenAndCreditWallet({
            adminId,
            email: customerEmail,  // ✅ send the one tied to the authorization_code
            token,
            amount: Number(amount),
            metadata: {
                adminId: String(adminId),
                purpose: "wallet_topup_token"
            }
        });

        return res
            .status(result.success ? 200 : 400)
            .json(result)
    } catch (err) {
        console.error("💥 Paystack Charge-Token Error:", err.message);
        return res.status(500).json({ success: false, message: err.message })
    }
}