import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  build: {
    chunkSizeWarningLimit: 900,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes("node_modules")) return;
          if (id.includes("firebase")) return "firebase";
          if (id.includes("xlsx")) return "xlsx";
          if (id.includes("jspdf") || id.includes("html2canvas") || id.includes("canvg") || id.includes("dompurify"))
            return "pdf";
          if (id.includes("react")) return "react";
          return "vendor";
        },
      },
    },
  },
});
