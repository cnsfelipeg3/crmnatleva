import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";
import { visualizer } from "rollup-plugin-visualizer";
import { VitePWA } from "vite-plugin-pwa";

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
    VitePWA({
      registerType: "autoUpdate",
      injectRegister: null, // registramos manualmente em main.tsx com guard de iframe/preview
      includeAssets: [
        "favicon.png",
        "icons/favicon-16.png",
        "icons/favicon-32.png",
        "icons/apple-touch-icon-180.png",
      ],
      manifest: {
        name: "NatLeva CRM",
        short_name: "NatLeva",
        description: "NatLeva — Sistema interno de viagens premium",
        theme_color: "#0d2620",
        background_color: "#0d2620",
        display: "standalone",
        orientation: "portrait",
        scope: "/",
        start_url: "/",
        lang: "pt-BR",
        categories: ["business", "productivity", "travel"],
        icons: [
          { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
          { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
          { src: "/icons/icon-192-maskable.png", sizes: "192x192", type: "image/png", purpose: "maskable" },
          { src: "/icons/icon-512-maskable.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
        ],
      },
      workbox: {
        // Precache só o essencial · evita travar o publish com 13MB+ de assets.
        // Chunks de rota carregam sob demanda via runtimeCaching abaixo.
        globPatterns: ["index.html", "assets/index-*.{js,css}", "favicon.png", "icons/*.png"],
        maximumFileSizeToCacheInBytes: 2 * 1024 * 1024,
        cleanupOutdatedCaches: true,
        clientsClaim: true,
        skipWaiting: false,
        navigateFallback: "/index.html",
        navigateFallbackDenylist: [/^\/api\//, /^\/auth\//, /\.[a-z0-9]+$/i],
        runtimeCaching: [
          {
            urlPattern: ({ url, sameOrigin }) => sameOrigin && url.pathname.startsWith("/assets/"),
            handler: "CacheFirst",
            options: {
              cacheName: "app-assets-cache",
              expiration: { maxEntries: 300, maxAgeSeconds: 60 * 60 * 24 * 30 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
          {
            urlPattern: /^https:\/\/.*\.supabase\.co\/(rest|functions)\/.*/i,
            handler: "NetworkFirst",
            options: {
              cacheName: "supabase-api-cache",
              networkTimeoutSeconds: 5,
              expiration: { maxEntries: 100, maxAgeSeconds: 60 * 60 * 24 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
          {
            urlPattern: /^https:\/\/.*\.supabase\.co\/auth\/.*/i,
            handler: "NetworkOnly",
          },
          {
            urlPattern: /^https:\/\/.*\.supabase\.co\/storage\/.*/i,
            handler: "CacheFirst",
            options: {
              cacheName: "supabase-storage-cache",
              expiration: { maxEntries: 200, maxAgeSeconds: 60 * 60 * 24 * 7 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
          {
            urlPattern: /^https:\/\/fonts\.(googleapis|gstatic)\.com\/.*/i,
            handler: "CacheFirst",
            options: {
              cacheName: "google-fonts-cache",
              expiration: { maxEntries: 30, maxAgeSeconds: 60 * 60 * 24 * 30 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
        ],
      },
      devOptions: { enabled: false },
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
    modulePreload: { polyfill: false },
    commonjsOptions: {
      transformMixedEsModules: true,
    },
    // Sem manualChunks · evita Temporal Dead Zone (TDZ) por dependências
    // circulares entre libs (ex: recharts/lodash/victory, radix/react-*).
    // Rollup faz code-splitting automático por dynamic import.
    rollupOptions: {},
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
