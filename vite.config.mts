import { resolve } from "path"
import { defineConfig } from "vite"
import topLevelAwait from "vite-plugin-top-level-await"

export default defineConfig({
    build: {
        target: "node16",
        lib: {
            // Could also be a dictionary or array of multiple entry points
            entry: resolve(__dirname, "src/index.ts"),
            name: "setup-binaryen",
            formats: ["cjs"],
        },
        minify: true,
    },
})
