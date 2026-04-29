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
  define: {
    CESIUM_BASE_URL: JSON.stringify("/cesium/"),
  },
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
    rollupOptions: {
      output: {
        // Splitting agressivo · isola libs pesadas em chunks próprios pra que
        // o boot inicial NÃO carregue Cesium/Three/Leaflet/Recharts etc.
        // Cada uma só baixa quando a rota correspondente é visitada.
        manualChunks(id) {
          if (!id.includes("node_modules")) return undefined;

          // === Libs MUITO pesadas · isolar 100% ===
          // Cesium NÃO é agrupado: bundle monolítico causa TDZ ("Cannot access 'Dv' before initialization").
          // Deixar o Vite splittar naturalmente via lazy imports (já está em optimizeDeps.exclude).
          if (id.includes("/three/") || id.includes("@react-three")) return "vendor-three";
          if (id.includes("/leaflet") || id.includes("react-leaflet")) return "vendor-leaflet";
          if (id.includes("recharts") || id.includes("/d3-")) return "vendor-charts";
          if (id.includes("framer-motion")) return "vendor-framer";
          if (id.includes("@xyflow") || id.includes("reactflow")) return "vendor-reactflow";
          if (id.includes("monaco-editor") || id.includes("@monaco-editor")) return "vendor-monaco";
          if (id.includes("@tiptap") || id.includes("prosemirror")) return "vendor-tiptap";
          if (id.includes("html2canvas") || id.includes("jspdf") || id.includes("html-to-image")) return "vendor-pdf";
          if (id.includes("xlsx") || id.includes("papaparse")) return "vendor-spreadsheet";
          if (id.includes("mermaid")) return "vendor-mermaid";

          // === Libs médias · agrupar por domínio ===
          if (id.includes("@radix-ui")) return "vendor-radix";
          if (id.includes("@tanstack")) return "vendor-tanstack";
          if (id.includes("@supabase")) return "vendor-supabase";
          if (id.includes("date-fns")) return "vendor-date";
          if (id.includes("lucide-react")) return "vendor-icons";
          if (id.includes("react-hook-form") || id.includes("zod") || id.includes("@hookform")) return "vendor-forms";
          if (id.includes("react-router")) return "vendor-router";

          // === Core React ===
          if (id.includes("/react/") || id.includes("/react-dom/") || id.includes("scheduler")) return "vendor-react";

          // === resto ===
          return "vendor-misc";
        },
      },
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
      "cesium",
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
