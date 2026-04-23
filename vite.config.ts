import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
    hmr: {
      overlay: false,
    },
  },
  plugins: [
    react(),
    mode === "development" && componentTagger(),
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
    dedupe: ["react", "react-dom", "react/jsx-runtime"],
  },
  define: {
    CESIUM_BASE_URL: JSON.stringify("/cesium/"),
  },
  build: {
    target: "esnext",
    // Skip gzip-size reporting on each chunk — speeds up production builds
    // significantly and has no runtime impact.
    reportCompressedSize: false,
    rollupOptions: {
      output: {
        // Granular vendor splitting — keeps initial route chunks small and
        // lets the browser cache heavy/seldom-used libraries independently.
        manualChunks: (id) => {
          if (!id.includes("node_modules")) return undefined;

          // CRITICAL: React + every library that imports React MUST live in the
          // same chunk. Splitting React from libs that call React.useLayoutEffect
          // at module-init time (three.js / @react-three / framer-motion /
          // recharts / @xyflow / react-day-picker / embla-carousel etc.) causes
          // a "Cannot read properties of undefined (reading 'useLayoutEffect')"
          // crash in production because the consumer chunk loads before React
          // is initialised. Keep them together — Rollup will still tree-shake.
          if (/[\\/]node_modules[\\/](react|react-dom|react-router|react-router-dom|scheduler|three|@react-three|framer-motion|recharts|@xyflow|react-day-picker|embla-carousel|leaflet|react-leaflet|@radix-ui|@tanstack)[\\/]/.test(id)) {
            return "vendor-react";
          }

          // Data fetching.
          if (/[\\/]node_modules[\\/]@tanstack[\\/]react-query[\\/]/.test(id)) return "vendor-query";
          if (/[\\/]node_modules[\\/]@tanstack[\\/]react-virtual[\\/]/.test(id)) return "vendor-virtual";

          // Supabase SDK.
          if (/[\\/]node_modules[\\/]@supabase[\\/]/.test(id)) return "vendor-supabase";

          // Heavy/lazy-only libs that DON'T touch React at module init — safe to isolate.
          if (/[\\/]node_modules[\\/]cesium[\\/]/.test(id)) return "vendor-cesium";
          if (/[\\/]node_modules[\\/]xlsx[\\/]/.test(id)) return "vendor-xlsx";
          if (/[\\/]node_modules[\\/](html2pdf\.js|jspdf|html2canvas)[\\/]/.test(id)) return "vendor-pdf";
          if (/[\\/]node_modules[\\/](emoji-mart|@emoji-mart)[\\/]/.test(id)) return "vendor-emoji";
          if (/[\\/]node_modules[\\/]react-markdown[\\/]/.test(id)) return "vendor-markdown";
          if (/[\\/]node_modules[\\/](remark-|rehype-|micromark|mdast|hast)/.test(id)) return "vendor-markdown";

          // Icons — lucide-react has 1000+ icons; isolate to avoid bloating route chunks.
          if (/[\\/]node_modules[\\/]lucide-react[\\/]/.test(id)) return "vendor-icons";

          // Date utils.
          if (/[\\/]node_modules[\\/]date-fns[\\/]/.test(id)) return "vendor-date";

          // Forms.
          if (/[\\/]node_modules[\\/](react-hook-form|@hookform|zod)[\\/]/.test(id)) return "vendor-forms";

          return "vendor-misc";
        },
        experimentalMinChunkSize: 10_000,
      },
    },
    chunkSizeWarningLimit: 1500,
  },
}));
