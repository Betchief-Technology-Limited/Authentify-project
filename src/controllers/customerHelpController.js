import Help from "../models/customerHelp.js";

export const submitHelpForm = async (req, res) => {
    try {
        const { 
            firstName,
            lastName,
            companyName,
            companyEmail,
            subject,
            description,
            phoneNumber,
            country,
            agreedToTerms 
        } = req.body;

        // Validate required fields
        if(
            !firstName ||
            !lastName ||
            !companyName ||
            !companyEmail ||
            !subject ||
            !description ||
            !phoneNumber ||
            !country ||
            typeof agreedToTerms !== "boolean"
        ) {
            return res.status(400).json({ success: false, message: 'All fields are required' })
        }

        // **New Line 1: Get the client ID from the authenticated user object**
        // const clientId = req.client?._id;

        // Save to DB
        const helpEntry = await Help.create({
            firstName,
            lastName,
            companyName,
            companyEmail,
            subject,
            description,
            phoneNumber,
            country,
            agreedToTerms,
            status: "pending"
        });

        return res.status(201).json({
            success: true,
            message: "Help request submitted successfully",
            data: helpEntry
        })
    } catch (error) {
        console.error("Error submitting help form:", error);
        return res.status(500).json({
            success: false,
            message: "Failed to submit help form",
            error: error.message
        })
    }
}