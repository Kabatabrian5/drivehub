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
        return res.status(503).json({
            error: "Secure image storage is not configured."
        });
    }

    try {
        await requireAdmin(req);

        const publicIds = req.body?.publicIds;
        if (!Array.isArray(publicIds) || publicIds.length > 8 ||
            publicIds.some(id =>
                typeof id !== "string" ||
                !id.startsWith("drivehub/vehicles/") ||
                id.length > 255
            )) {
            return res.status(400).json({ error: "Invalid vehicle image IDs." });
        }

        const results = [];
        for (const publicId of publicIds) {
            const timestamp = Math.floor(Date.now() / 1000);
            const signature = signCloudinaryParameters(
                { public_id: publicId, timestamp },
                process.env.CLOUDINARY_API_SECRET
            );
            const body = new URLSearchParams({
                api_key: process.env.CLOUDINARY_API_KEY,
                public_id: publicId,
                timestamp: String(timestamp),
                signature
            });

            const response = await fetch(
                `https://api.cloudinary.com/v1_1/${encodeURIComponent(process.env.CLOUDINARY_CLOUD_NAME)}/image/destroy`,
                { method: "POST", body }
            );
            const result = await response.json();

            if (!response.ok || !["ok", "not found"].includes(result.result)) {
                throw new Error("Cloudinary did not delete a vehicle image.");
            }
            results.push(publicId);
        }

        return res.status(200).json({ deleted: results.length });
    } catch (error) {
        if (error.statusCode) {
            return res.status(error.statusCode).json({ error: error.message });
        }

        console.error("Could not delete Cloudinary vehicle images:", error);
        return res.status(502).json({
            error: "Could not remove all vehicle images from Cloudinary."
        });
    }
};
