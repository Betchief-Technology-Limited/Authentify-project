import mongoose from "mongoose";
import { serviceDB } from "../config/db.js";
import bcrypt from 'bcrypt';

const serviceAdminSchema = new mongoose.Schema(
    {
        fullName: { type: String, required: true, trim: true },
        email: {
            type: String,
            required: true,
            unique: true,
            lowercase: true,
            match: [/\S+@\S+\.\S+/, 'Please provide a valid email address']
        },
        password: { type: String, required: true, minlength: 6 }
    },
    { timestamps: true }
);

// Compare password method
serviceAdminSchema.methods.matchPassword = async function (enteredPassword) {
    return await bcrypt.compare(enteredPassword, this.password);
};

const ServiceAdmin = serviceDB.model('ServiceAdmin', serviceAdminSchema);

export default ServiceAdmin;