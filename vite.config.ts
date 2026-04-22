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

          // React core — required on every page, keep tiny.
          if (/[\\/]node_modules[\\/](react|react-dom|react-router|react-router-dom|scheduler)[\\/]/.test(id)) {
            return "vendor-react";
          }

          // Radix UI — multiple separate packages, group together.
          if (/[\\/]node_modules[\\/]@radix-ui[\\/]/.test(id)) return "vendor-radix";

          // Data fetching.
          if (/[\\/]node_modules[\\/]@tanstack[\\/]react-query[\\/]/.test(id)) return "vendor-query";
          if (/[\\/]node_modules[\\/]@tanstack[\\/]react-virtual[\\/]/.test(id)) return "vendor-virtual";

          // Supabase SDK.
          if (/[\\/]node_modules[\\/]@supabase[\\/]/.test(id)) return "vendor-supabase";

          // Charts. Keep recharts isolated and let each d3-* stay in its own
          // chunk to avoid top-level temporal-dead-zone errors caused by
          // circular module init when all d3 sub-packages are merged.
          if (/[\\/]node_modules[\\/]recharts[\\/]/.test(id)) return "vendor-charts";
          // Do NOT group d3-* into a single chunk — return undefined so Rollup
          // keeps Rollup's default per-package splitting, which preserves the
          // correct module-init order between d3 packages.

          // Animation.
          if (/[\\/]node_modules[\\/]framer-motion[\\/]/.test(id)) return "vendor-motion";

          // Heavy/lazy-only libs — isolate so they're never in the entry bundle.
          if (/[\\/]node_modules[\\/]three[\\/]/.test(id)) return "vendor-3d";
          if (/[\\/]node_modules[\\/]@react-three[\\/]/.test(id)) return "vendor-3d";
          if (/[\\/]node_modules[\\/]cesium[\\/]/.test(id)) return "vendor-cesium";
          if (/[\\/]node_modules[\\/]@xyflow[\\/]/.test(id)) return "vendor-flow";
          if (/[\\/]node_modules[\\/]xlsx[\\/]/.test(id)) return "vendor-xlsx";
          if (/[\\/]node_modules[\\/](html2pdf\.js|jspdf|html2canvas)[\\/]/.test(id)) return "vendor-pdf";
          if (/[\\/]node_modules[\\/](emoji-mart|@emoji-mart)[\\/]/.test(id)) return "vendor-emoji";
          if (/[\\/]node_modules[\\/]react-day-picker[\\/]/.test(id)) return "vendor-daypicker";
          if (/[\\/]node_modules[\\/]embla-carousel/.test(id)) return "vendor-carousel";
          if (/[\\/]node_modules[\\/]leaflet[\\/]/.test(id)) return "vendor-leaflet";
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
