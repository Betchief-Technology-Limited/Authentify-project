
import Admin from "../models/Admin.js";
import Wallet from "../models/wallet.js";

// Get only the current logged-in admin (not all)
export const getCurrentAdmin = async (req, res) => {
    try {
        // req.admin is attached from your auth middleware
        const admin = await Admin.findById(req.admin._id).select("apiKeys firstName lastName email _id");
        console.log(admin)
        
        if (!admin) {
            return res.status(404).json({ message: "Admin not found" });
        }

        // ✅ Fetch REAL waalet balance
        const wallet = await Wallet.findOne({ admin: admin._id });
        const liveBalance = wallet ? wallet.balance : 0
        
        return res.json({
            ...admin.toObject(),
            walletBalance: liveBalance
        }); // <--- returns admin object directly
    } catch (err) {
        console.error("Error fetching admin:", err);
        return res.status(500).json({ message: "Error fetching admin", error: err.message });
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