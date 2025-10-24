import { v2 as cloudinary } from "cloudinary";

cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_CLOUD_API_KEY,
    api_secret: process.env.CLOUDINARY_CLOUD_SECRET_KEY
})

/**
 * Upload a Buffer to Cloudinary using upload_stream.
 * @param {Buffer} buffer
 * @param {string} folder
 * @param {string} [filename]
 * @returns {Promise<string>} secure_url
 */

export const uploadToCloudinary = async (buffer, folder, filename = undefined) => {
    try {
        const result = await new Promise((resolve, reject) => {
            const stream = cloudinary.uploader.upload_stream(
                { folder, public_id: filename, resource_type: "auto" },
                (err, result) => {
                    if (err) reject(err);
                    else resolve(result);
                }
            );
            stream.end(buffer);
        });

        return result.secure_url;
    } catch (err) {
        console.error("Cloudinary Upload Error:", err);
        throw new Error("File upload failed.");
    }
};