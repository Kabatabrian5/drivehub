"use strict";

const { neon } = require("@neondatabase/serverless");

module.exports = async function handler(req, res) {
    if (req.method !== "GET") {
        res.setHeader("Allow", "GET");
        return res.status(405).json({ error: "Method not allowed." });
    }

    if (!process.env.DATABASE_URL) {
        res.setHeader("Cache-Control", "no-store");
        return res.status(503).json({
            error: "Vehicle database is not configured."
        });
    }

    try {
        const sql = neon(process.env.DATABASE_URL);
        const cars = await sql`
            SELECT
                id,
                make,
                model,
                year,
                price,
                mileage,
                engine,
                fuel,
                transmission,
                condition,
                location,
                description,
                images,
                tiktok_url AS "tiktokUrl",
                phone,
                dealer_id AS "dealerId",
                status,
                featured,
                created_at AS "createdAt"
            FROM vehicles
            WHERE status IN ('approved', 'available')
            ORDER BY created_at DESC
            LIMIT 100
        `;

        res.setHeader(
            "Cache-Control",
            "public, max-age=0, s-maxage=60, stale-while-revalidate=300"
        );
        return res.status(200).json({ cars });
    } catch (error) {
        console.error("Public vehicle query failed:", error);
        res.setHeader("Cache-Control", "no-store");
        return res.status(500).json({
            error: "Could not load vehicle listings."
        });
    }
};
