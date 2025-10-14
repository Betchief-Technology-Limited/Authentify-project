import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import Admin from '../models/Admin.js';
import dotenv from 'dotenv';

dotenv.config();

const SECRET_KEY = process.env.SECRET_KEY


export const adminLogIn = async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({ success: false, message: "Email and password are required" });
        }

        // Check if the email and password is correct
        const admin = await Admin.findOne({ email });
        if (!admin) return res.status(400).json({ message: 'Invalid email or password' });

        // check if the password used during signing up and saved in the database matches the one been used during login
        const isMatch = await bcrypt.compare(password, admin.password);
        if (!isMatch) return res.status(400).json({ message: 'Invalid email or password' });


        // Generate JWT
        const token = jwt.sign(
            { adminId: admin._id, email: admin.email },
            SECRET_KEY,
            { expiresIn: "1h" }
        );

        // ✅ Send token in HttpOnly cookie
        res.cookie('token', token, {
            httpOnly: true, //cant be access with JS
            secure: process.env.NODE_ENV === 'production', //only over http then switch to https when it is over in production
            sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
            maxAge: 60 * 60 * 1000, // 1hour
        })

        res.status(200).json({
            success: true,
            message: "Login successful",
            token,
            admin: {
                id: admin._id,
                firstName: admin.firstName,
                lastName: admin.lastName,
                email: admin.email,
                walletBalance: admin.walletBalance,
                testApiKeys: admin.apiKeys.test,
                liveApiKeys: admin.apiKeys.live
            },
            token, //optional: keep for postman testing - frontend shud not use it
        });

    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error', error: err.message })
    }
}

// Logout Controller
export const adminLogout = (req, res) => {
    res.clearCookie('token', {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
    });
    res.json({ message: 'Logout successful' });
}
