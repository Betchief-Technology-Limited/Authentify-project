import Subscription from "../models/subscription.js";
import Wallet from "../models/wallet.js";
import SERVICE_COSTS from "../config/serviceCosts.js";

// 📌 Subscribe client to a subservice
export const subscribeService = async (req, res) => {
    try {
        const { serviceType, subservice } = req.body;
        const admin = req.admin;

        if (!SERVICE_COSTS[serviceType] || !SERVICE_COSTS[serviceType][subservice]) {
            return res.status(400).json({ success: false, message: 'Invalid subservice' })
        }

        // confirm if there is an existing subscription
        const existing = await Subscription.findOne({ admin: admin._id, serviceType, subservice, active: true });
        if (existing) {
            return res.status(400).json({ success: false, message: 'Already subscribed to this service' })
        }

        // check wallet balance before subscribing to the service
        const wallet = await Wallet.findOne({ admin: admin._id });
        const cost = SERVICE_COSTS[serviceType][subservice];
        if (!wallet || wallet.balance < cost) {
            return res.status(400).json({ success: false, message: 'Insufficient wallet balance' });
        }

        const subscription = await Subscription.create({
            admin: admin._id,
            serviceType,
            subservice,
            costPerCall: cost
        });

        res.status(201).json({
            success: true,
            message: `Subscribed to ${serviceType.toUpperCase()} - ${subservice}`,
            subscription
        })
    } catch (err) {
        console.error('Subscription error:', err);
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
}

// 📌 Unsubscribe from a service
export const unsubscribeService = async (req, res) => {
    try {
        const { serviceType, subservice } = req.body;
        const admin = req.admin;

        const subscription = await Subscription.findOne({ admin: admin._id, serviceType, subservice, active: true });
        if (!subscription) {
            return res.status(400).json({ success: false, message: 'Active subscription not found' });
        }

        subscription.active = false;
        subscription.unsubscribedAt = new Date();
        await subscription.save();

        res.json({ success: true, message: `${subservice} unsubscribed successfully!!!` });
    } catch (err) {
        console.error('Unsubscribe error:', err)
        res.status(500).json({ success: false, message: 'Internal server error' })
    }
};

// 📌 Get all active subscriptions
export const getActiveSubscriptions = async (req, res) => {
    try {
        const admin = req.admin;
        const subscription = await Subscription.find({ admin: admin._id, active: true })
        return res.json({ success: true, subscription });
    } catch (err) {
        console.error('Get subscriptions error:', err)
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
}
