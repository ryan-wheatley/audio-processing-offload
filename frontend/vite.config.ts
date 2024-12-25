import { defineConfig } from "vite"
import react from "@vitejs/plugin-react"

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      "/process": {
        target: "http://localhost:3000", // Express server URL
        changeOrigin: true,
      },
    },
  },
})