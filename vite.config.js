"use strict";

const path = require("node:path");
const fs = require("node:fs");
const { defineConfig } = require("vite");

module.exports = defineConfig({
    plugins: [{
        name: "copy-classic-app-scripts",
        generateBundle() {
            for (const fileName of ["script.js", "admin.js"]) {
                this.emitFile({
                    type: "asset",
                    fileName,
                    source: fs.readFileSync(path.resolve(__dirname, fileName), "utf8")
                });
            }
        }
    }],
    build: {
        outDir: "dist",
        rollupOptions: {
            input: {
                main: path.resolve(__dirname, "index.html"),
                admin: path.resolve(__dirname, "admin.html")
            }
        }
    }
});
