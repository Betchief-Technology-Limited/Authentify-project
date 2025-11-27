import { processQuickVerificationRequest } from "../services/kycQuickService.js";

export async function quickVerification(req, res) {
    try {
        const result = await processQuickVerificationRequest(req.body)

        if (!result.success) {
            return res.status(400).json(result);
        }

        return res.status(200).json(result)
    } catch (err) {
        console.error("Quick verification error:", err);
        return res.status(500).json({ message: "Server error", error: err.message });
    }
}