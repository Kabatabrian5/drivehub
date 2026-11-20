"use strict";

const crypto = require("node:crypto");

function signCloudinaryParameters(parameters, apiSecret) {
    const serialized = Object.keys(parameters)
        .sort()
        .map(key => `${key}=${parameters[key]}`)
        .join("&");

    return crypto
        .createHash("sha1")
        .update(`${serialized}${apiSecret}`)
        .digest("hex");
}

module.exports = { signCloudinaryParameters };
