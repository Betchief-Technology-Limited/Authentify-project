import jwt from "jsonwebtoken";
import Admin from "../models/Admin.js";

const SECRET_KEY = process.env.SECRET_KEY

export const verifyEmail = async (req, res) => {
    try {
        const { token } = req.query;

        if (!token) {
            return res.redirect(
                "http://localhost:5173/user-verification?verified=false&reason=missing_token"
            );
        }

        const admin = await Admin.findOne({
            verificationToken: token,
            verificationExpires: { $gt: Date.now() },
        });

        if (!admin) {
            return res.redirect(
                "http://localhost:5173/user-verification?verified=false&reason=invalid_or_expired"
            );
        }

        // ✅ Mark verified
        admin.emailVerified = true;
        admin.verificationToken = null;
        admin.verificationExpires = null;
        await admin.save();

        // ✅ ISSUE LOGIN TOKEN (THIS IS WHAT YOU MISSED)
        const jwtToken = jwt.sign(
            { adminId: admin._id, email: admin.email },
            SECRET_KEY,
            { expiresIn: "24h" }
        );

        res.cookie("token", jwtToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: process.env.NODE_ENV === "production" ? "none" : "lax" ,
            maxAge: 60 * 60 * 1000
        });

        // ✅ Redirect logged-in user
        return res.redirect(
            "http://localhost:5173/user-verification?verified=true"
        );

    } catch (err) {
        console.error(err);
        return res.redirect(
            "http://localhost:5173/user-verification?verified=false&reason=server_error"
        );
    }
};





















// import Admin from "../models/Admin.js";
// import jwt from "jsonwebtoken";

// export const verifyEmail = async (req, res) => {
//     try {
//         const { token, mode } = req.query;

//         // ✅ Check for missing token
//         if (!token) {
//             if (mode === "json") {
//                 return res.status(400).json({
//                     success: false,
//                     message: "Missing verification token",
//                 });
//             }
//             return res.redirect(
//                 "http://localhost:5173/user-verification?verified=false&reason=missing_token"
//             );
//         }

//         // ✅ Find admin by token (and ensure token is not expired)
//         const admin = await Admin.findOne({
//             verificationToken: token,
//             verificationExpires: { $gt: Date.now() },
//         });

//         // ❌ Invalid or expired token
//         if (!admin) {
//             if (mode === "json") {
//                 return res.status(400).json({
//                     success: false,
//                     message: "Invalid or expired verification link.",
//                 });
//             }
//             return res.redirect(
//                 "http://localhost:5173/user-verification?verified=false&reason=invalid_or_expired"
//             );
//         }

//         // ✅ Update verification status
//         admin.emailVerified = true;
//         admin.verificationToken = null;
//         admin.verificationExpires = null;
//         await admin.save();

//         // ✅ JSON response (API use)
//         if (mode === "json") {
//             return res.status(200).json({
//                 success: true,
//                 message: "Email verified successfully. You can now log in.",
//             });
//         }

//         // ✅ Redirect for browser-based verification
//         return res.redirect(
//             "http://localhost:5173/user-verification?verified=true"
//         );
//     } catch (error) {
//         console.error("❌ Email verification error:", error);

//         if (req.query.mode === "json") {
//             return res.status(500).json({
//                 success: false,
//                 message: "Server error during email verification",
//             });
//         }

//         return res.redirect(
//             "http://localhost:5173/user-verification?verified=false&reason=server_error"
//         );
//     }
// };
