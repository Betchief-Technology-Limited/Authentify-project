import Otp from '../models/otp.js';
import Transaction from '../models/transaction.js';
import Wallet from '../models/wallet.js';
import verifySignature from '../utils/helperFunction.js';


const TIME_WINDOW_SECONDS = 300; //5 minutes

export const handleTelegramWebhook = async (req, res) => {
    try {
        // Verify signature and timestamp
        const ts = parseInt(req.headers['x-request-timestamp'], 10)
        const now = Math.floor(Date.now() / 1000)
        if (Math.abs(now - ts) > TIME_WINDOW_SECONDS) {
            return res.status(400).send('Stale timestamp');
        }

        if (!verifySignature(req)) {
            return res.status(401).send('Invalid signature');
        }

        const payload = req.body; //RequestStatus object 
        const { request_id, phone_number, delivery_status, verification_status, is_refunded, request_cost } = payload;

        // Find OTP by providerRequestId or by payload.custom/payload(this is already saved in the providerRequestId)
        const otpDoc = await Otp.findOne({ providerRequestId: request_id });

        // If not found, search by providerRaw.request_id
        if (!otpDoc) {
            // here there is nothing to be done: return success so Telegram doesn't keep retrying 
            return res.status(200).send('ok')
        }

        // Update providerRaw and delivery status
        const transaction = await Transaction.findOne({ provider: 'telegram', tx_ref: otpDoc.providerTransactionRef });

        // If delivery_status indicates delivered/sent, mark success and deduct the wallet
        const deliveryStatus = delivery_status?.status || null;

        if (deliveryStatus && ['delivered', 'sent'].includes(deliveryStatus)) {
            otpDoc.status = 'delivered';
            await otpDoc.save();

            if (transaction && transaction.status === 'pending') {
                transaction.status = 'successful';
                transaction.rawPayLoad = payload;
                await transaction.save();

                // deduct wallet now (only if not already deducted)
                const wallet = await Wallet.findOne({ admin: transaction.admin });
                const cost = parseFloat(process.env.TG_GATEWAY_API_COST || '50');
                if (wallet) {
                    wallet.balance = (wallet.balance || 0) - cost;
                    wallet.history.push({ type: 'debit', amount: cost, description: `Telegram OTP ${request_id}` });

                    await wallet.save();
                }
            }
        }

        // If refunded or expired => mark transaction failed and credit if previously deducted
        const isExpired = deliveryStatus === 'expired';
        if (payload.is_refunded || isExpired) {
            otpDoc.status = 'failed';
            await otpDoc.save();

            if (transaction) {
                // if transaction was marked success earlier and we deducted, then we need to refund
                if (transaction.status === 'successful') {
                    // refund wallet
                    const wallet = await Wallet.findOne({ admin: transaction.admin });
                    const cost = parseFloat(process.env.TG_GATEWAY_API_COST || '50');
                    if (wallet) {
                        wallet.balance = (wallet.balance || 0) + cost;
                        wallet.history.push({ type: 'credit', amount: cost, description: `Refund Telegram OTP ${request_id}` });
                        await wallet.save();
                    }
                }
                transaction.status = 'failed';
                transaction.rawPayLoad = payload;
                await transaction.save();
            }
        }

        return res.status(200).send('ok');

    } catch (err) {
        console.error('Telegram webhook processing error:', err);
        return res.status(500).send('error');
    }
}
