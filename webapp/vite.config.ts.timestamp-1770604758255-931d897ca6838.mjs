// vite.config.ts
import { defineConfig } from "file:///C:/Users/Exodus%20Daniella/Documents/iTech/Dapps/Vibecode/Thots/penny4thots/webapp/node_modules/.pnpm/vite@5.4.21_@types+node@22.19.9/node_modules/vite/dist/node/index.js";
import react from "file:///C:/Users/Exodus%20Daniella/Documents/iTech/Dapps/Vibecode/Thots/penny4thots/webapp/node_modules/.pnpm/@vitejs+plugin-react-swc@3._127436a83a2f3746662edf15e12ebd9e/node_modules/@vitejs/plugin-react-swc/index.js";
import { vibecodePlugin } from "file:///C:/Users/Exodus%20Daniella/Documents/iTech/Dapps/Vibecode/Thots/penny4thots/webapp/node_modules/.pnpm/@vibecodeapp+webapp@1.0.7_e_e9cb03a1c778298a1c308a632331483b/node_modules/@vibecodeapp/webapp/dist/plugin.js";
import path from "path";
var __vite_injected_original_dirname = "C:\\Users\\Exodus Daniella\\Documents\\iTech\\Dapps\\Vibecode\\Thots\\Penny4Thots\\webapp";
var vite_config_default = defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8e3,
    allowedHosts: true
    // Allow all hosts
  },
  plugins: [
    react(),
    mode === "development" && vibecodePlugin()
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__vite_injected_original_dirname, "./src")
    }
  }
}));
export {
  vite_config_default as default
};
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsidml0ZS5jb25maWcudHMiXSwKICAic291cmNlc0NvbnRlbnQiOiBbImNvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9kaXJuYW1lID0gXCJDOlxcXFxVc2Vyc1xcXFxFeG9kdXMgRGFuaWVsbGFcXFxcRG9jdW1lbnRzXFxcXGlUZWNoXFxcXERhcHBzXFxcXFZpYmVjb2RlXFxcXFRob3RzXFxcXFBlbm55NFRob3RzXFxcXHdlYmFwcFwiO2NvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9maWxlbmFtZSA9IFwiQzpcXFxcVXNlcnNcXFxcRXhvZHVzIERhbmllbGxhXFxcXERvY3VtZW50c1xcXFxpVGVjaFxcXFxEYXBwc1xcXFxWaWJlY29kZVxcXFxUaG90c1xcXFxQZW5ueTRUaG90c1xcXFx3ZWJhcHBcXFxcdml0ZS5jb25maWcudHNcIjtjb25zdCBfX3ZpdGVfaW5qZWN0ZWRfb3JpZ2luYWxfaW1wb3J0X21ldGFfdXJsID0gXCJmaWxlOi8vL0M6L1VzZXJzL0V4b2R1cyUyMERhbmllbGxhL0RvY3VtZW50cy9pVGVjaC9EYXBwcy9WaWJlY29kZS9UaG90cy9QZW5ueTRUaG90cy93ZWJhcHAvdml0ZS5jb25maWcudHNcIjtpbXBvcnQgeyBkZWZpbmVDb25maWcgfSBmcm9tIFwidml0ZVwiO1xyXG5pbXBvcnQgcmVhY3QgZnJvbSBcIkB2aXRlanMvcGx1Z2luLXJlYWN0LXN3Y1wiO1xyXG5pbXBvcnQgeyB2aWJlY29kZVBsdWdpbiB9IGZyb20gXCJAdmliZWNvZGVhcHAvd2ViYXBwL3BsdWdpblwiO1xyXG5pbXBvcnQgcGF0aCBmcm9tIFwicGF0aFwiO1xyXG5cclxuLy8gaHR0cHM6Ly92aXRlanMuZGV2L2NvbmZpZy9cclxuZXhwb3J0IGRlZmF1bHQgZGVmaW5lQ29uZmlnKCh7IG1vZGUgfSkgPT4gKHtcclxuICBzZXJ2ZXI6IHtcclxuICAgIGhvc3Q6IFwiOjpcIixcclxuICAgIHBvcnQ6IDgwMDAsXHJcbiAgICBhbGxvd2VkSG9zdHM6IHRydWUsIC8vIEFsbG93IGFsbCBob3N0c1xyXG4gIH0sXHJcbiAgcGx1Z2luczogW1xyXG4gICAgcmVhY3QoKSxcclxuICAgIG1vZGUgPT09IFwiZGV2ZWxvcG1lbnRcIiAmJiB2aWJlY29kZVBsdWdpbigpLFxyXG4gIF0uZmlsdGVyKEJvb2xlYW4pLFxyXG4gIHJlc29sdmU6IHtcclxuICAgIGFsaWFzOiB7XHJcbiAgICAgIFwiQFwiOiBwYXRoLnJlc29sdmUoX19kaXJuYW1lLCBcIi4vc3JjXCIpLFxyXG4gICAgfSxcclxuICB9LFxyXG59KSk7XHJcbiJdLAogICJtYXBwaW5ncyI6ICI7QUFBd2IsU0FBUyxvQkFBb0I7QUFDcmQsT0FBTyxXQUFXO0FBQ2xCLFNBQVMsc0JBQXNCO0FBQy9CLE9BQU8sVUFBVTtBQUhqQixJQUFNLG1DQUFtQztBQU16QyxJQUFPLHNCQUFRLGFBQWEsQ0FBQyxFQUFFLEtBQUssT0FBTztBQUFBLEVBQ3pDLFFBQVE7QUFBQSxJQUNOLE1BQU07QUFBQSxJQUNOLE1BQU07QUFBQSxJQUNOLGNBQWM7QUFBQTtBQUFBLEVBQ2hCO0FBQUEsRUFDQSxTQUFTO0FBQUEsSUFDUCxNQUFNO0FBQUEsSUFDTixTQUFTLGlCQUFpQixlQUFlO0FBQUEsRUFDM0MsRUFBRSxPQUFPLE9BQU87QUFBQSxFQUNoQixTQUFTO0FBQUEsSUFDUCxPQUFPO0FBQUEsTUFDTCxLQUFLLEtBQUssUUFBUSxrQ0FBVyxPQUFPO0FBQUEsSUFDdEM7QUFBQSxFQUNGO0FBQ0YsRUFBRTsiLAogICJuYW1lcyI6IFtdCn0K
