import {
  defineConfig,
} from "vite";

import react from
  "@vitejs/plugin-react";

import { resolve } from "path";

export default defineConfig({
  plugins: [react()],

  build: {
    outDir: "dist",

    emptyOutDir: true,

    rollupOptions: {
      input: {
        index: resolve(
          __dirname,
          "index.html"
        ),

        test: resolve(
          __dirname,
          "test.html"
        ),

        popup: resolve(
          __dirname,
          "popup.html"
        ),

        content: resolve(
          __dirname,
          "src/extension/content.ts"
        ),
      },

      output: {
        entryFileNames: (
          chunkInfo
        ) => {
          if (
            chunkInfo.name ===
            "content"
          ) {
            return "content.js";
          }

          return "assets/[name]-[hash].js";
        },
      },
    },
  },
});