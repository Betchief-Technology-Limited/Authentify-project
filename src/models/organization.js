import mongoose from "mongoose";
import { orgDB } from "../config/db.js";

const organizationSchema = new mongoose.Schema(
    {
        // ==========================================================
        // 1️⃣ TELL US MORE ABOUT YOURSELF
        // ==========================================================
        personalProfile: {
            firstName: {
                type: String,
                trim: true,
                required: function () {
                    return this.onboardingStatus === "submitted"
                }
            },
            lastName: {
                type: String,
                trim: true,
                required: function () {
                    return this.onboardingStatus === "submitted"
                }
            },
            phoneNumber: {
                type: String,
                trim: true,
                required: function () {
                    return this.onboardingStatus === "submitted"
                }
            },
            gender: {
                type: String,
                enum: ["male", "female"],
                required: function () {
                    return this.onboardingStatus === "submitted"
                }
            }
        },

        // ==========================================================
        // 2️⃣ TELL US MORE ABOUT YOUR BUSINESS
        // ==========================================================
        businessProfile: {
            registeredName: {
                type: String,
                trim: true,
                required: function () {
                    return this.onboardingStatus === "submitted"
                }
            },
            registrationNumber: {
                type: String,
                trim: true,
                uppercase: true,
                required: function () {
                    return this.onboardingStatus === "submitted"
                }
            },
            industry: {
                type: String,
                trim: true,
                required: function () {
                    return this.onboardingStatus === "submitted"
                }
            }
        },

        // ==========================================================
        // 3️⃣ DATA PROTECTION OFFICER DETAILS
        // ==========================================================
        dataProtectionOfficer: {
            firstName: {
                type: String,
                trim: true,
                required: function () {
                    return this.onboardingStatus === "submitted"
                }
            },
            lastName: {
                type: String,
                trim: true,
                required: function () {
                    return this.onboardingStatus === "submitted"
                }
            },
            phoneNumber: {
                type: String,
                trim: true,
                required: function () {
                    return this.onboardingStatus === "submitted"
                }
            },
            gender: {
                type: String,
                enum: ["male", "female"],
                required: function () {
                    return this.onboardingStatus === "submitted"
                }
            },

        },

        // ==========================================================
        // 4️⃣ DOCUMENT UPLOADS
        // ==========================================================
        uploads: {
            certificateOfIncorporation: {
                type: String,
                required: function () {
                    return this.onboardingStatus === "submitted"
                }
            },
            directorsId: {
                type: String,
                required: function () {
                    return this.onboardingStatus === "submitted"
                }
            },
            shareholdersParticulars: {
                type: String //optional
            },
            operatingLicence: {
                type: String //optional
            },
        },

        // ==========================================================
        // 5️⃣ SUPPLEMENTAL QUESTIONS (Yes/No)
        // ==========================================================
        requiresLicense: {
            type: Boolean,
            required: function () {
                return this.onboardingStatus === "submitted"
            },
            default: false
        },
        servicesRegulatedByAuthority: {
            type: Boolean,
            required: function () {
                return this.onboardingStatus === "submitted"
            },
            default: false
        },
        complyWithAntiLaundering: {
            type: Boolean,
            required: function () {
                return this.onboardingStatus === "submitted"
            },
            default: false
        },
        hasAntiLaunderingPolicies: {
            type: Boolean,
            required: function () {
                return this.onboardingStatus === "submitted"
            },
            default: false
        },
        hasNdaWithStaff: {
            type: Boolean,
            required: function () {
                return this.onboardingStatus === "submitted"
            },
            default: false
        },
        hasSanctionsForLaundering: {
            type: Boolean,
            required: function () {
                return this.onboardingStatus === "submitted"
            },
            default: false
        },
        hasSanctionsForDataBreach: {
            type: Boolean,
            required: function () {
                return this.onboardingStatus === "submitted"
            },
            default: false
        },
        hasDataProtectionPolicy: {
            type: Boolean,
            required: function () {
                return this.onboardingStatus === "submitted"
            },
            default: false
        },
        dataProtection: {
            adoptSecurityMeasures: {
                type: Boolean,
                required: function () {
                    return this.onboardingStatus === "submitted";
                },
                default: false
            },
            transferDataToOtherCountries: {
                type: Boolean,
                required: function () {
                    return this.onboardingStatus === "submitted";
                },
                default: false
            },
            useDataForOtherPurposes: {
                type: Boolean,
                required: function () {
                    return this.onboardingStatus === "submitted";
                },
                default: false
            },
            sanctionedByRegulator: {
                type: Boolean,
                required: function () {
                    return this.onboardingStatus === "submitted";
                },
                default: false
            },
            createAlternateDatabase: {
                type: Boolean,
                required: function () {
                    return this.onboardingStatus === "submitted";
                },
                default: false
            },
        },

        // ==========================================================
        // 6️⃣ ONBOARDING PROGRESS (SAVE & CONTINUE LATER)
        // ==========================================================
        onboardingStatus: {
            type: String,
            enum: ["draft", "submitted"],
            default: "draft"
        },
        currentStep: {
            type: Number,
            default: 1
        },
        completedSteps: {
            type: [Number],
            default: []
        },
        completionPercentage: {
            type: Number,
            default: 0
        },
        lastSavedAt: {
            type: Date
        },

        // ==========================================================
        // 7️⃣ AGREEMENTS & CLIENT
        // ==========================================================
        agreedToTerms: {
            type: Boolean,
            required: function () {
                return this.onboardingStatus === "submitted";
            },
            default: false,
        },
        clientId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Client",
            required: true
        },

        // ==========================================================
        // 8️⃣ VERIFICATION & NOTIFICATIONS
        // ==========================================================
        verificationStatus: {
            type: String,
            enum: ["not_submitted", "pending", "verified", "rejected"],
            default: "not_submitted",
        },
        verificationFeedback: { type: String, trim: true, default: "" },
        verifiedAt: { type: Date },
        emailNotification: {
            sent: { type: Boolean, default: false },
            sentAt: { type: Date },
        },
    },
    {
        timestamps: true,
        collection: "organization_profiles",
    }
);

// ==========================================================
// 🧩 NORMALIZE BOOLEAN FIELDS (handle "true"/"false" as string)
// ==========================================================
organizationSchema.pre("save", function (next) {
    const normalize = (val) => (val === "true" ? true : val === "false" ? false : val);

    //ROOT booleans
    [
        "requiresLicense",
        "servicesRegulatedByAuthority",
        "complyWithAntiLaundering",
        "hasAntiLaunderingPolicies",
        "hasNdaWithStaff",
        "hasSanctionsForLaundering",
        "hasSanctionsForDataBreach",
        "hasDataProtectionPolicy",
        "agreedToTerms",
    ].forEach((field) => {
        this[field] = normalize(this[field]);
    });

    // NESTED booleans
    if (this.dataProtection) {
        [
            "adoptSecurityMeasures",
            "transferDataToOtherCountries",
            "useDataForOtherPurposes",
            "sanctionedByRegulator",
            "createAlternateDatabase",
        ].forEach((key) => {
            this.dataProtection[key] = normalize(this.dataProtection[key]);
        });
    }

    // if (this.dataProtection) {
    //     for (const key in this.dataProtection) {
    //         this.dataProtection[key] = normalize(this.dataProtection[key]);
    //     }
    // }

    next();
});

// ==========================================================
// 🧩 INDEXES
// ==========================================================
organizationSchema.index({ clientId: 1 });
organizationSchema.index({ onboardingStatus: 1 });
organizationSchema.index({ verificationStatus: 1 });

const Organization = orgDB.model("Organization", organizationSchema);
export default Organization;

