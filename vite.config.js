import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: { port: 3000, open: true, host: true }, // host: phones on the same Wi-Fi can open it (http://<computer IP>:3000)
  build: { outDir: "build" }, // Firebase Hosting serves "build" (see firebase.json)
});
