export default function errorHandler(err, req, res, next) {
    console.error("Unhandled error:", err);
    const status = err.status || 500;
    res.status(status).json({
        success: false,
        message: err.message || "Internal server error",
    });
}