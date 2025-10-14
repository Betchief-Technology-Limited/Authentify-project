
import Admin from "../models/Admin.js";

// Get only the current logged-in admin (not all)
export const getCurrentAdmin = async (req, res) => {
    try {
        // req.admin is attached from your auth middleware
        const admin = await Admin.findById(req.admin._id).select("apiKeys firstName lastName email walletBalance");
        
        if (!admin) {
            return res.status(404).json({ message: "Admin not found" });
        }
        
        res.json(admin); // <--- returns admin object directly
    } catch (err) {
        console.error("Error fetching admin:", err);
        res.status(500).json({ message: "Error fetching admin", error: err.message });
    }
};

// This is to get all users or all admin 

// import Admin from "../models/Admin.js";

// export const getAllAdmin = async(req, res)=>{
//     try {
//         const admins = await Admin.find().select('-firstName -lastName -email -organization'); //fetch all users
//         res.json(admins)
//     } catch (err) {
//         console.error(err);
//         res.status(500).json({ message: 'Error fetching users', err })
//     }
// }