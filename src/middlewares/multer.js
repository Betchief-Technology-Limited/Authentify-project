import multer from 'multer';

const storage = multer.memoryStorage();

const allowed = new Set([
    "application/pdf",
    "image/jpeg",
    "image/jpg",
    "image/png"
]);

const fileFilter = (req, file, cb) => {
    if (allowed.has(file.mimetype)) return cb(null, true);
    cb(new Error('Invalid file type. Only PDF, JPG, and PNG allowed'));
};

export const upload = multer({
    storage,
    fileFilter,
    limits: {
        fileSize: 10 * 1024 * 1024, //10MB per file
        files: 4,   //safety: max 4 files
    }
})