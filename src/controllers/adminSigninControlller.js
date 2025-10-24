import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import Admin from '../models/Admin.js';
import dotenv from 'dotenv';
import Wallet from '../models/wallet.js';

dotenv.config();

const SECRET_KEY = process.env.SECRET_KEY;

export const adminLogIn = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ success: false, message: "Email and password are required" });
    }

    // Check if the admin exists
    const admin = await Admin.findOne({ email });
    if (!admin) return res.status(400).json({ message: 'Invalid email or password' });

    // Verify password
    const isMatch = await bcrypt.compare(password, admin.password);
    if (!isMatch) return res.status(400).json({ message: 'Invalid email or password' });

    // ✅ Fetch wallet balance
    const wallet = await Wallet.findOne({ admin: admin._id });
    const currentBalance = wallet ? wallet.balance : 0;

    // ✅ Generate JWT
    const token = jwt.sign(
      { adminId: admin._id, email: admin.email },
      SECRET_KEY,
      { expiresIn: "24h" }
    );

    // ✅ Determine cookie security based on environment
    const isLocalFrontend = req.headers.origin?.includes("localhost");

    res.cookie('token', token, {
      httpOnly: true,              // can't be accessed via JS
      secure: !isLocalFrontend,    // false for localhost, true for production
      sameSite: isLocalFrontend ? "lax" : "none", // lax for localhost, none for cross-site prod
      maxAge: 24 * 60 * 60 * 1000, // 24 hours
    });

    // ✅ Send response
    res.status(200).json({
      success: true,
      message: "Login successful",
      admin: {
        id: admin._id,
        firstName: admin.firstName,
        lastName: admin.lastName,
        email: admin.email,
        walletBalance: currentBalance,
        testApiKeys: admin.apiKeys.test,
        liveApiKeys: admin.apiKeys.live,
      },
      token, // for Postman testing only (frontend should ignore this)
    });
  } catch (err) {
    console.error("Login error:", err);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

// ✅ Logout Controller
export const adminLogout = (req, res) => {
  const isLocalFrontend = req.headers.origin?.includes("localhost");

  res.clearCookie('token', {
    httpOnly: true,
    secure: !isLocalFrontend,
    sameSite: isLocalFrontend ? "lax" : "none",
  });

  res.json({ message: 'Logout successful' });
};
