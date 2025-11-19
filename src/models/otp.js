import mongoose from "mongoose";
import { userDB } from "../config/db.js";

const otpSchema = new mongoose.Schema({
   admin: { type: mongoose.Schema.Types.ObjectId, ref: 'Admin' },
   to: { type: String, required: true }, //recipient Phone number(E.164)
   secret: { type: String, required: true }, // OTP secret generated via authentifyotp library
   verified: { type: Boolean, default: false },
   status: {
      type: String,
      enum: ['pending', 'delivered', 'failed'],
      default: 'pending'
   }, //Status of OTP: pending, delivered, failed

   // Provider info
   provider: { type: String, default: 'mobishastra' },
   providerMessageId: { type: String },
   providerRequestId: { type: String },
   providerResponseCode: { type: String },
   providerTransactionRef: { type: String },
   providerRaw: { type: Object },
   deliveryStatus: { type: String }, // 'pending','delivered','failed'

   //Selectable OTP specific fields
   options: [{ type: String }], //array of codes to display to user
   requestId: { type: String, unique: true, sparse: true }, //unique OTP session ID
   deviceFingerprint: { type: String }, //track app/device requesting OTP
   attempts: { type: Number, default: 0 }, // number of verification attempts
   maxAttempts: { type: Number, default: 5 },
   ttlSeconds: { type: Number, default: 90 }, //TTL in seconds for OTP
   verified: { type: Boolean, default: false },

   // Expiry
   expiresAt: {
      type: Date,
      required: true,
      index: { expires: 0 } //TTL index --> deletes doc at expiresAt
   },

   // Metadata for future use 
   meta: { type: Object, default: () => ({ createdAt: new Date() }) },


   createdAt: { type: Date, default: Date.now }
}
);

const Otp = userDB.model('Otp', otpSchema)

export default Otp