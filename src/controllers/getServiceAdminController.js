import ServiceAdmin from "../models/serviceAdmin.js";

export const getCurrentServiceAdmin = async (req, res) => {
    try {
        const serviceAdmin = await ServiceAdmin.findById(req.serviceAdmin._id).select("email fullName _id")
        // console.log(serviceAdmin);
        // const serviceAdmin = await ServiceAdmin.find().select("email fullName _id");
        // console.log(serviceAdmin);

        if (!serviceAdmin) {
            return res.status(404).json({ message: "Service admin not found" })
        }

        return res.json(serviceAdmin)
    } catch (err) {
        console.error("Error fetching service admin", err);
        return res.status(500).json({ message: "Error fetching service admin", error: err.message });
    }
}