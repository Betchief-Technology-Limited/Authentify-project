// src/models/serviceAdmin.js
import mongoose from "mongoose";
import { serviceDB } from "../config/db.js";
import bcrypt from "bcrypt";

const serviceAdminSchema = new mongoose.Schema(
    {
        fullName: { type: String, required: true, trim: true },
        email: {
            type: String,
            required: true,
            unique: true,
            lowercase: true,
            match: [/\S+@\S+\.\S+/, "Please provide a valid email address"],
        },
        password: { type: String, required: true, minlength: 6 },
    },
    { timestamps: true }
);

// ✅ Hash password before saving
serviceAdminSchema.pre("save", async function (next) {
    // Only hash if password is new or modified
    if (!this.isModified("password")) return next();

    try {
        const salt = await bcrypt.genSalt(10);
        this.password = await bcrypt.hash(this.password, salt);
        next();
    } catch (err) {
        next(err);
    }
});

// ✅ Compare password method
serviceAdminSchema.methods.matchPassword = async function (enteredPassword) {
    return await bcrypt.compare(enteredPassword, this.password);
};

const ServiceAdmin = serviceDB.model("ServiceAdmin", serviceAdminSchema);

export default ServiceAdmin;


























// import mongoose from "mongoose";
// import { serviceDB } from "../config/db.js";
// import bcrypt from 'bcrypt';

// const serviceAdminSchema = new mongoose.Schema(
//     {
//         fullName: { type: String, required: true, trim: true },
//         email: {
//             type: String,
//             required: true,
//             unique: true,
//             lowercase: true,
//             match: [/\S+@\S+\.\S+/, 'Please provide a valid email address']
//         },
//         password: { type: String, required: true, minlength: 6 }
//     },
//     { timestamps: true }
// );

// // Compare password method
// serviceAdminSchema.methods.matchPassword = async function (enteredPassword) {
//     return await bcrypt.compare(enteredPassword, this.password);
// };

// const ServiceAdmin = serviceDB.model('ServiceAdmin', serviceAdminSchema);

// export default ServiceAdmin;