import {
    verifyFlutterwavePayment,
    initiateFlutterwavePayment,
    handleFlutterwaveWebhook,
    initTransaction,
    finalizePaystackFunding,
    handlePaystackWebhook
} from "../services/paymentService.js"

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


// STEP 1️⃣ – Initialize Paystack payment
export const initializePaystackPayment = async (req, res) => {
    try {
        const { amount } = req.body;
        const adminId = req.admin._id;
        const email = req.admin.email;

        const result = await initTransaction(adminId, email, amount);
        res.status(200).json({
            success: true,
            message: "Paystack transaction initialized"
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
        const adminId = req.admin._id;

        const result = await finalizePaystackFunding(adminId, reference);
        res.status(200).json(result);
    } catch (err) {
        console.error("💥 Paystack Confirm Error:", err.message);
        res.status(500).json({ success: false, message: err.message });
    }
};

// STEP 3️⃣ – Handle Paystack webhook (server-to-server)
export const handlePaystackWebhookController = async (req, res) => {
    try {
        const event = req.body;
        if (event.event === "charge.success") {
            const reference = event.data.reference;
            const adminId = event.data.metadata.adminId;
            await finalizePaystackFunding(adminId, reference);
        }
        res.sendStatus(200);
    } catch (err) {
        console.error("💥 Paystack Webhook Error:", err.message);
        res.status(500).json({ success: false, message: err.message });
    }
};