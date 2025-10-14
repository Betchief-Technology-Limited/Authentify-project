import { 
    verifyFlutterwavePayment, 
    initiateFlutterwavePayment, 
    handleFlutterwaveWebhook 
} from "../services/paymentService.js"

// STEP 1: Initiate payment
export const paymentInit = async (req, res) => {
    try {
        const { amount } = req.body;
        const adminId = req.admin._id //this comes from jwtAuth middleware

        if (!amount || amount <= 0) {
            return res.status(400).json({ success: false, message: 'Invalid amount' });
        }

        const {paymentUrl, tx_ref} = await initiateFlutterwavePayment(adminId, amount);

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
        if(!tx_ref) {
            return res.status(400).json({ succes: false, message: 'tx_ref is required' });
        }

        const result = await verifyFlutterwavePayment(tx_ref);

        res.json({
            sucess: result.success,
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