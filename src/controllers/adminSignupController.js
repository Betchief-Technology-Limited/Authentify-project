import bcrypt from 'bcrypt';
import Admin from '../models/Admin.js';
import { generateApiKeys } from '../utils/apiKeyGenerator.js';



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
                live: { publicKey: null, secretKey: null  }
            }
        });

        await newAdmin.save();

        res.status(201).json({ 
            success: true, 
            message: 'User registered succesfully' ,
            adminId: newAdmin._id,
            firstName,
            lastName
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error', error: err.message })
    }

}