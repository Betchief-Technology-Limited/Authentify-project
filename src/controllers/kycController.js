import { processKycVerification, getKycStatus } from "../services/kycService.js";

export const verifyKyc = async (req, res) => {
    try {
        const { userIdentifier, type } = req.body;
        const admin = req.admin;

        if (!userIdentifier || !type) {
            return res.status(400).json({ success: false, message: 'userIdentifier and type are required.' });
        }

        const result = await processKycVerification(admin, userIdentifier, type);

        return res.status(200).json({
            success: true,
            message: 'KYC verification processed successfully',
            kycRecord: result.kycRecord,
            transaction: result.transaction
        })
    } catch (err) {
        console.error('verification error:', err.message);
        return res.status(400).json({ success: false, message: err.message });
    }
};

export const getKycRecordStatus = async (req, res) => {
    try {
        const { tx_ref } = req.params;
        const record = await getKycStatus(tx_ref);

        return res.json({ success: true, data: record });
    } catch (err) {
        console.error('getKycRecordStatus error:', err.message);
        return res.status(404).json({ success: false, message: err.message });
    }
}