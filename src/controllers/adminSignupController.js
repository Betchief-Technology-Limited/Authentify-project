import bcrypt from 'bcrypt';
import Admin from '../models/Admin.js';
import crypto from 'crypto';
import { generateApiKeys } from '../utils/apiKeyGenerator.js';
import Wallet from '../models/wallet.js';
import { sendVerificationEmail } from '../utils/sendEmailVerificationForSignup.js';



export const adminSignUp = async (req, res) => {
    try {
        const { firstName, lastName, email, organization, password, confirmPassword, terms } = req.body;

        if (!firstName || !lastName || !email || !organization || !password || !confirmPassword || !terms) {
            return res.status(400).json({ message: "All fields are required" });
        }

        if (!terms) {
            return res.status(400).json({ message: 'You must accept the terms and conditions' })
        }

        if (password !== confirmPassword) {
            return res.status(400).json({ message: "Passwords do not match" });
        }

        // First confirm if there is an existing admin
        const existingAdmin = await Admin.findOne({ email });
        if (existingAdmin) {
            return res.status(400).json({ message: 'User already exist with this email' })
        }

        // hashing of the password
        const hashedPassword = await bcrypt.hash(password, 10);

        // Create verification token
        const verificationToken = crypto.randomBytes(32).toString('hex');
        const verificationExpires = Date.now() + 1000 * 60 * 60 * 24; //24 hours

        // Generate test keys only
        const testKeys = generateApiKeys('test');

        const newAdmin = new Admin({
            firstName,
            lastName,
            email,
            organization,
            password: hashedPassword,
            terms,
            apiKeys: {
                test: testKeys,
                live: { publicKey: null, secretKey: null }
            },
            verificationToken,
            verificationExpires
        });

        await newAdmin.save();

        // ✅Automatically create wallet for this admin
        await Wallet.create({
            admin: newAdmin._id,
            balance: 0,
            history: []
        });

        // Send verification email
        const verificationUrl = `http://localhost:3005/api/admin/verify-email?token=${verificationToken}`;
        await sendVerificationEmail(email, firstName, verificationUrl);

        // ✅ Send email (non-blocking — signup response is sent immediately)
        sendVerificationEmail(email, firstName, verificationUrl).catch((err) => {
            console.error("❌ Email send error:", err.message);
        });

        res.status(201).json({
            success: true,
            message: 'Signup successful! Please check your email to verify your account before loggin in',
            adminId: newAdmin._id,
            firstName,
            lastName
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error', error: err.message })
    }

}