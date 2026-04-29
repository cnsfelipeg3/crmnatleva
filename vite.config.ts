import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";
import { visualizer } from "rollup-plugin-visualizer";

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
    mode === "production" && visualizer({
      filename: "dist/bundle-report.html",
      open: false,
      gzipSize: true,
      brotliSize: true,
      template: "treemap",
    }),
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
    dedupe: ["react", "react-dom", "react/jsx-runtime"],
  },
  define: {},
  esbuild: {
    // Em produção remove console.* (exceto warn/error) e debugger
    // → bundle menor + zero ruído no console do cliente.
    drop: mode === "production" ? ["debugger"] : [],
    pure: mode === "production" ? ["console.log", "console.info", "console.debug", "console.trace"] : [],
    legalComments: "none",
  },
  build: {
    target: "esnext",
    reportCompressedSize: false,
    chunkSizeWarningLimit: 1500,
    cssCodeSplit: true,
    sourcemap: false,
    commonjsOptions: {
      transformMixedEsModules: true,
    },
  },
  // Pre-bundle das deps mais usadas na inicialização · acelera dev start
  optimizeDeps: {
    include: [
      "react",
      "react-dom",
      "react-dom/client",
      "react/jsx-runtime",
      "react-router-dom",
      "@tanstack/react-query",
      "@supabase/supabase-js",
      "lucide-react",
      "date-fns",
      "sonner",
      "clsx",
      "tailwind-merge",
      "class-variance-authority",
      // Recharts é CJS-heavy via lodash/* internamente. Pre-bundling resolve
      // o "does not provide an export named 'default'" e acelera dev start
      // porque Vite não precisa fazer dep-scan a cada request.
      "recharts",
      // Leaflet é CommonJS (UMD) · precisa ser pre-bundled pelo Vite
      // pra expor `export default L`. Sem isso, `import * as L from "leaflet"`
      // falha em dev com "does not provide an export named 'default'".
      "leaflet",
    ],
    exclude: [
      // Pesadas · só carregam sob demanda
      "three",
      "@react-three/fiber",
      "@react-three/drei",
      // recharts REMOVIDO do exclude · ele importa `lodash/get` como CJS
      // internamente e, fora do pre-bundle, o browser falha com
      // "does not provide an export named 'default'". Deixar o Vite
      // pre-bundleá-lo resolve a interop CJS↔ESM via esbuild.
      "framer-motion",
      "monaco-editor",
      "mermaid",
      "html2canvas",
      "jspdf",
      "xlsx",
    ],
  },
}));
