import mongoose from "mongoose";
import dotenv from 'dotenv';

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI;

// MONGODB CONNECTION
export const connectDB = async()=>{
    try {
        await mongoose.connect(MONGODB_URI)
        console.log('✅MongoDB connected to User_Authentication DB')
    } catch (err) {
        console.error('❌ Failed to connect to MongoDB', err.message);
        process.exit(1);
    }
}
