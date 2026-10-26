import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: { port: 3000, open: true, host: true }, // host: phones on the same Wi-Fi can open it (http://<computer IP>:3000)
  build: {
    outDir: "build", // Firebase Hosting serves "build" (see firebase.json)
    rollupOptions: {
      output: {
        // all the icons in one file: without this every icon a page uses is its own tiny download (150+ requests per page)
        manualChunks(id) {
          if (id.includes("/node_modules/lucide-react/")) return "icons";
          if (/\/node_modules\/(react|react-dom|react-router|react-router-dom|scheduler)\//.test(id)) return "react";
        },
      },
    },
  },
});
