import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import { vibecodePlugin } from "@vibecodeapp/webapp/plugin";
import path from "path";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8000,
    allowedHosts: true, // Allow all hosts
  },
  plugins: [
    react(),
    mode === "development" && vibecodePlugin(),
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  optimizeDeps: {
    // Force re-optimization when dependencies change
    force: mode === "development",
    // Exclude problematic packages from pre-bundling
    exclude: ["@tanstack/react-query"],
    // Include packages that need to be pre-bundled
    include: [
      "react",
      "react-dom",
      "framer-motion",
      "lucide-react",
    ],
  },
  // Clear cache on build
  cacheDir: "node_modules/.vite",
}));
