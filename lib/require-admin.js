"use strict";

const { neon } = require("@neondatabase/serverless");

let remoteJwks;

async function requireAdmin(req) {
    if (!process.env.DATABASE_URL || !process.env.VITE_NEON_AUTH_URL) {
        const error = new Error("Admin image services are not configured.");
        error.statusCode = 503;
        throw error;
    }

    const authorization = req.headers.authorization || "";
    const tokenMatch = authorization.match(/^Bearer\s+(.+)$/i);
    if (!tokenMatch) {
        const error = new Error("Sign in as an authorized admin to manage images.");
        error.statusCode = 401;
        throw error;
    }

    const { createRemoteJWKSet, jwtVerify } = await import("jose");
    const authUrl = process.env.VITE_NEON_AUTH_URL.replace(/\/+$/, "");
    remoteJwks ||= createRemoteJWKSet(
        new URL(`${authUrl}/.well-known/jwks.json`)
    );

    let payload;
    try {
        ({ payload } = await jwtVerify(tokenMatch[1], remoteJwks));
    } catch {
        const error = new Error("The sign-in token is invalid or expired.");
        error.statusCode = 401;
        throw error;
    }

    const userId = typeof payload.sub === "string" ? payload.sub : "";
    if (!userId) {
        const error = new Error("The sign-in token has no user ID.");
        error.statusCode = 401;
        throw error;
    }

    const sql = neon(process.env.DATABASE_URL);
    const admins = await sql`
        SELECT EXISTS (
            SELECT 1
            FROM public.drivehub_admins
            WHERE user_id = ${userId}
        ) AS allowed
    `;

    if (!admins[0]?.allowed) {
        const error = new Error("This account is not authorized to manage images.");
        error.statusCode = 403;
        throw error;
    }

    return userId;
}

module.exports = { requireAdmin };
