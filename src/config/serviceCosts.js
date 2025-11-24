import dotenv from 'dotenv';

dotenv.config();

const SERVICE_COSTS = {
    otp: {
        sms: Number(process.env.SMS_API_COST),
        whatsapp: Number(process.env.WHATSAPP_API_COST),
        telegram: Number(process.env.TG_GATEWAY_API_COST)
    },

    kyc: {
        premium_nin: Number(process.env.KYC_COST_PREMIUM_NIN),
        virtual_nin: Number(process.env.KYC_COST_VIRTUAL_NIN),
        slip_nin: Number(process.env.KYC_COST_SLIP_NIN),
        passport: Number(process.env.KYC_COST_PASSPORT),
        voter_card: Number(process.env.KYC_COST_VOTER_CARD),
        drivers_licence: Number(process.env.KYC_COST_DRIVERS_LICENCE)
    }, 

    email: {
        basic_email: Number(process.env.EMAIL_API_COST),
        bulk_email: Number(process.env.BULK_EMAIL_API_COST),
        marketing_email: Number(process.env.MARKETKING_EMAIL_API_COST)
    }
}

export default SERVICE_COSTS;