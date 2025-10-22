export const verifyCAC = async (registrationNumber) => {
    try {
        //Simulate API verification
        //Replace this with real CAC API call when available
        const validRegNumbers = ['1234567', 'RC12345', 'BN98765'] //test data
        return validRegNumbers.includes(registrationNumber.trim());
    } catch (error) {
        console.error('CAC verification failed:', error);
        return false;
    }
}