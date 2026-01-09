import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

const host = process.env.TAURI_DEV_HOST;

export default defineConfig(async () => ({
  plugins: [react(), tailwindcss()],

  clearScreen: false,

  server: {
    port: 1420,
    strictPort: true,
    host: host || false,

    hmr: host
      ? {
          protocol: "ws",
          host,
          port: 1421,
        }
      : undefined,

    watch: {
      ignored: ["**/src-tauri/**"],
    },

    /* ✅ PROXY FIX (THIS SOLVES CORS) */
    proxy: {
      "/NEW_SNU_BOOKING": {
        target: "http://k-rsv.snu.ac.kr:8011",
        changeOrigin: true,
        secure: false,
        cookieDomainRewrite: "localhost",
      },

      // ✅ ADD THIS
      "/SEATAPI": {
        target: "http://k-rsv.snu.ac.kr:8012",
        changeOrigin: true,
        secure: false,
      },
    },
  },
}));
