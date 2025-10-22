import mongoose from "mongoose";

const organizationSchema = new mongoose.Schema(
    {
        // ===========================
        // 1. BUSINESS DETAILS SECTION
        // ===========================
        registeredName: {
            type: String,
            required: [true, "Registered company name is required"],
            trim: true,
        },
        registrationNumber: {
            type: String,
            required: [true, "CAC registration number is required"],
            trim: true,
        },
        officeAddress: {
            type: String,
            required: [true, "Office address is required"],
            trim: true,
        },
        countryOfIncorporation: {
            type: String,
            required: [true, "Country of incorporation is required"],
            trim: true,
        },
        serviceCategory: {
            type: String,
            required: [true, "Service category is required"],
            trim: true,
        },
        directorsOrPartners: {
            type: [String],
            required: [true, "At least one director/partner/trustee name is required"],
        },

        // ===========================
        // 2. CONTACT PERSON SECTION
        // ===========================
        contactPerson: {
            fullName: {
                type: String,
                required: [true, "Full name of contact person is required"],
                trim: true,
            },
            jobTitle: {
                type: String,
                required: [true, "Designation/Job title is required"],
                trim: true,
            },
            email: {
                type: String,
                required: [true, "Contact email is required"],
                lowercase: true,
                trim: true,
                match: [/\S+@\S+\.\S+/, "Please provide a valid email address"],
            },
            phoneNumber: {
                type: String,
                required: [true, "Contact phone number is required"],
                trim: true,
            },
            website: {
                type: String,
                trim: true,
                match: [
                    /^(https?:\/\/)?([\w\d-]+\.){1,}\w{2,}(\/.*)?$/,
                    "Please provide a valid website URL",
                ],
            },
        },

        // ===========================
        // 3. DATA PROTECTION OFFICER
        // ===========================
        dataProtectionOfficer: {
            fullName: { type: String, required: true, trim: true },
            address: { type: String, required: true, trim: true },
            contactEmail: {
                type: String,
                required: true,
                trim: true,
                lowercase: true,
                match: [/.+@.+\..+/, "Please enter a valid email address"],
            },
            contactPhone: { type: String, required: true, trim: true },
        },

        // ===========================
        // 4. UPLOADED BUSINESS FILES
        // ===========================
        uploads: {
            certificateOfIncorporation: { type: String, required: true },
            particularsOfDirectors: { type: String, required: true },
            particularsOfShareholders: { type: String },
            operatingLicence: { type: String },
        },

        // ===========================
        // 5. SUPPLEMENTAL QUESTION
        // ===========================
        requiresLicense: { type: Boolean, required: true, default: false },
        servicesRegulatedByAuthority: { type: Boolean, required: true, default: false },
        complyWithAntiLaundering: { type: Boolean, required: true, default: false },
        hasAntiLaunderingPolicies: { type: Boolean, required: true, default: false },
        hasNdaWithStaff: { type: Boolean, required: true, default: false },
        hasSanctionsForLaundering: { type: Boolean, required: true, default: false },
        hasSanctionsForDataBreach: { type: Boolean, required: true, default: false },
        hasDataProtectionPolicy: { type: Boolean, required: true, default: false },

        // ===========================
        // 6. DATA PROTECTION DETAILS
        // ===========================
        dataProtection: {
            adoptSecurityMeasures: { type: Boolean, required: true },
            transferDataToOtherCountries: { type: Boolean, required: true },
            useDataForOtherPurposes: { type: Boolean, required: true },
            sanctionedByRegulator: { type: Boolean, required: true },
            createAlternateDatabase: { type: Boolean, required: true },
            countriesOfOperation: { type: [String], default: [] },
        },

        // ===========================
        // 6. AGREEMENT & RELATIONSHIP
        // ===========================
        agreedToTerms: { type: Boolean, required: true, default: false },
        clientId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Client",
            required: [true, "Client reference is required"],
        },
        // ===========================
        // 7. VERIFICATION SECTION (NEW)
        // ===========================
        verificationStatus: {
            type: String,
            enum: ['pending', 'approved', 'rejected'],
            default: 'pending'
        },
        verificationFeedback: {
            type: String,
            trim: true,
            default: "",
        },
        verifiedAt: { type: Date }
    },
    { timestamps: true, collection: "Organization_Registration" }
);
const Organization = mongoose.model('Organization', organizationSchema);
export default Organization;
