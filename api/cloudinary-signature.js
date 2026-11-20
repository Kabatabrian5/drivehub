"use strict";

const { requireAdmin } = require("../lib/require-admin");
const { signCloudinaryParameters } = require("../lib/cloudinary-signature");

module.exports = async function handler(req, res) {
    res.setHeader("Cache-Control", "no-store");

    if (req.method !== "POST") {
        res.setHeader("Allow", "POST");
        return res.status(405).json({ error: "Method not allowed." });
    }

    if (!process.env.CLOUDINARY_CLOUD_NAME ||
        !process.env.CLOUDINARY_API_KEY ||
        !process.env.CLOUDINARY_API_SECRET) {
        console.error("Cloudinary upload is missing server configuration.");
        return res.status(503).json({
            error: "Secure image upload is not configured."
        });
    }

    try {
        await requireAdmin(req);

        const folder = "drivehub/vehicles";
        const timestamp = Math.floor(Date.now() / 1000);
        const signature = signCloudinaryParameters(
            { folder, timestamp },
            process.env.CLOUDINARY_API_SECRET
        );

        return res.status(200).json({
            cloudName: process.env.CLOUDINARY_CLOUD_NAME,
            apiKey: process.env.CLOUDINARY_API_KEY,
            folder,
            timestamp,
            signature
        });
    } catch (error) {
        if (error.statusCode) {
            return res.status(error.statusCode).json({ error: error.message });
        }

        console.error("Could not create secure image upload signature:", error);
        return res.status(500).json({
            error: "Could not prepare secure image upload."
        });
    }
};
