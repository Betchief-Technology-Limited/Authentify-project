import bcrypt from 'bcrypt';
import Admin from '../models/Admin.js';
import crypto from 'crypto';
// import { generateApiKeys } from '../utils/apiKeyGenerator.js';
import { generatePublicKey, generateSecretKey } from '../utils/apiKeyGenerator.js';
import Wallet from '../models/wallet.js';
import { sendVerificationEmail } from '../utils/sendEmailVerificationForSignup.js';


export const adminSignUp = async (req, res) => {
    try {
        const { companyName, email, password, confirmPassword, terms } = req.body;

        if (!companyName || !email || !password || !confirmPassword || !terms) {
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
            return res.status(400).json({ message: 'Account with this email already exists' })
        }

        // hashing of the password
        const hashedPassword = await bcrypt.hash(password, 10);

        // Create verification token
        const verificationToken = crypto.randomBytes(32).toString('hex');
        const verificationExpires = Date.now() + 1000 * 60 * 60 * 24; //24 hours

        // Generate test keys only
        const publicKey = generatePublicKey("test");

        const { secretKey, secretHash } = await generateSecretKey('test');

        const newAdmin = new Admin({
            companyName,
            email,
            password: hashedPassword,
            terms,
            apiKeys: {
                test: {
                    publicKey,
                    secretKey,
                    createdAt: new Date(),
                    lastRotatedAt: new Date()
                },
                live: {}
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
        const verificationUrl = `https://authentify-project.onrender.com/api/admin/verify-email?token=${verificationToken}`;

        // ✅ Send email (non-blocking — signup response is sent immediately)

        sendVerificationEmail(email, companyName, verificationUrl).catch((err) => {
            console.error("❌ Email send error:", err.message);
        });

        return res.status(201).json({
            success: true,
            message: 'Signup successful! Please check your email to verify your account before login in',
            adminId: newAdmin._id,
            companyName,
            apiKeys: {
                test:{
                    publicKey,
                    secretKey,
                    createdAt: new Date(),
                    lastRotatedAt: new Date()
                },
                live: {}
            }
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error', error: err.message })
    }

}
