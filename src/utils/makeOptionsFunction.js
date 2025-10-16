// Helper: generate decoy options

export default function makeOptions(correctOtp, count = 3, digits = 2) {
    const optionsSet = new Set([correctOtp]);
    while (optionsSet.size < count) {
        const decoy = String(Math.floor(Math.random() * 10 ** digits)).padStart(digits, '0');
        optionsSet.add(decoy);
    }

    const arr = Array.from(optionsSet);

    // Shuffle
    for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [arr[i], arr[j]] = [arr[j], arr[i]];
    }

    return arr;
}