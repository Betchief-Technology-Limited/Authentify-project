// adapters/youVerifyAdapter.js
// Minimal adapter shape — return { verified: boolean, providerId?, raw? }
export const nimcVerifyAdapter = {
    async verifyNIN({ identityType, identityNumber, firstName, lastName }) {
        // TODO: replace with real API call to YouVerify / provider
        // Example response shape expected by service:
        // { verified: true/false, providerId: '...', raw: {...} }
        // For now, return mock success if identityNumber ends with even digit
        const lastChar = identityNumber.slice(-1);
        const isEven = !isNaN(lastChar) && (parseInt(lastChar, 10) % 2 === 0);
        return {
            verified: isEven,
            provider: "nimc",
            raw: { identityType, identityNumber, firstName, lastName, mocked: true }
        };
    },

    async verifyGeneric({ identityType, identityNumber, firstName, lastName }) {
        // Placeholder for passport/votercard/drivers
        return this.verifyNIN({ identityType, identityNumber, firstName, lastName });
    }
};
