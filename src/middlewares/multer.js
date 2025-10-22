import multer from "multer";
import fs from 'fs';

const tempDir = 'tmp';
if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir);

const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, tempDir),
    filename: (req, file, cb) => {
        const uniqueName = `${Date.now()}-${file.originalname.replace(/\s+/g, "_")}`
        cb(null, uniqueName);
    }
});

const fileFilter = (req, file, cb) => {
const allowed = ['application/pdf', 'image/jpeg', 'image/png'];
if(allowed.includes(file.mimetype)) cb(null, true);
else cb(new Error('Invalid file type. Only PDF, JPG, and PNG allowed.'));
};

export const upload = multer({ storage, fileFilter })