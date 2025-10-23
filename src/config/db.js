import mongoose from "mongoose";
import dotenv from "dotenv";

dotenv.config();

const {
    MONGODB_URI,
    ORG_VERIFICATION_MONGODB_URI,
    SERVICE_ADMIN_MONGODB_URI
} = process.env;

// ✅ Create & export persistent connections 
export const userDB = mongoose.createConnection(MONGODB_URI);
export const orgDB = mongoose.createConnection(ORG_VERIFICATION_MONGODB_URI);
export const serviceDB = mongoose.createConnection(SERVICE_ADMIN_MONGODB_URI);

// ✅ Listen for events
userDB.on("connected", () =>
    console.log("✅ MongoDB connected to User_Authentication DB")
);
orgDB.on("connected", () =>
    console.log("✅ MongoDB connected to Organization_Verification DB")
);
serviceDB.on("connected", () =>
    console.log("✅ MongoDB connected to Service_Admin DB")
);

// ✅ Handle connection errors gracefully
[userDB, orgDB, serviceDB].forEach((conn) => {
    conn.on("error", (err) => {
        console.error("❌ MongoDB connection error:", err.message);
    });
});
