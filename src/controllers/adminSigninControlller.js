import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import Admin from '../models/Admin.js';
import dotenv from 'dotenv';
import Wallet from '../models/wallet.js';

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

        // Check if the email has been verified by the client
        if (!admin.emailVerified) {
            return res.status(403).json({
                message: "Please verify your email before logging in"
            });
        }

        // check if the password used during signing up is saved in the database matches the one been used during login
        const isMatch = await bcrypt.compare(password, admin.password);
        if (!isMatch) return res.status(400).json({ message: 'Invalid email or password' });

        // ✅ Fetch live wallet from the database
        const wallet = await Wallet.findOne({ admin: admin._id });
        const currentBalance = wallet ? wallet.balance : 0;

        // Update admin's walletBalance field
        admin.walletBalance = currentBalance
        await admin.save();


        // Generate JWT
        const token = jwt.sign(
            { adminId: admin._id, email: admin.email },
            SECRET_KEY,
            { expiresIn: "24h" }
        );

        res.cookie('token', token, {
            httpOnly: true, 
            secure: process.env.NODE_ENV === 'production',
            sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
            maxAge: 60 * 60 * 1000, // 1hour
        });

        // // 🟢 Log what will be returned
        // console.log({
        //     id: admin._id,
        //     firstName: admin.firstName,
        //     lastName: admin.lastName,
        //     companyName: admin.companyName,
        //     email: admin.email,
        //     walletBalance: currentBalance,
        //     apiKeys: {
        //         test: {
        //             publicKey: admin.apiKeys?.test?.publicKey || null,
        //             createdAt: admin.apiKeys?.test?.createdAt || null,
        //             lastRotatedAt: admin.apiKeys?.test?.lastRotatedAt || null
        //         },
        //         live: {
        //             publicKey: admin.apiKeys?.live?.publicKey || null,
        //             createdAt: admin.apiKeys?.live?.createdAt || null,
        //             lastRotatedAt: admin.apiKeys?.live?.lastRotatedAt || null
        //         }
        //     }
        // });


        res.status(200).json({
            success: true,
            message: "Login successful",
            token,
            admin: {
                id: admin._id,
                firstName: admin.firstName,
                lastName: admin.lastName,
                email: admin.email,
                companyName: admin.companyName,
                walletBalance: currentBalance,
                apiKeys: {
                    test: {
                        publicKey: admin.apiKeys?.test?.publicKey || null,
                        createdAt: admin.apiKeys?.test?.createdAt || null,
                        lastRotatedAt: admin.apiKeys?.test?.lastRotatedAt || null
                    },
                    live: {
                        publicKey: admin.apiKeys?.live?.publicKey || null,
                        createdAt: admin.apiKeys?.live?.createdAt || null,
                        lastRotatedAt: admin.apiKeys?.live?.lastRotatedAt || null
                    }
                }
            }
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
