import { v2 as cloudianry } from "cloudinary";

cloudianry.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
})

export const uploadToCloudinary = async (filePath, folder) => {
    try {
        const result = await cloudianry.uploader.upload(filePath, {
            folder,
            resource_type: 'auto'
        });
        return result.secure_url
    } catch (err) {
        console.error('Cloudinary Upload Error:', err);
        throw new Error('File upload failed')
    }
}