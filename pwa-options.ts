import type { VitePWAOptions } from "vite-plugin-pwa";

// Public browser output only; no server chunks or private API responses.
export const pwaOptions = {
      strategies: "generateSW",
      outDir: "dist/client",
      filename: "sw.js",
      registerType: "autoUpdate",
      injectRegister: null,
      manifest: false,
      devOptions: { enabled: false },
      workbox: {
        globPatterns: ["**/*.{js,css,png,jpg,svg,woff2}", "offline.html", "offline/*.{txt,json}"],
        globIgnores: ["**/push-sw.js", "**/server/**"],
        maximumFileSizeToCacheInBytes: 5 * 1024 * 1024,
        navigateFallback: null,
        cleanupOutdatedCaches: true,
        skipWaiting: true,
        clientsClaim: true,
        runtimeCaching: [
          { urlPattern: ({ request, url }) => request.mode === "navigate" && (/^\/$/.test(url.pathname) || /^\/(preferiti|porto)(\/|$)/.test(url.pathname)), handler: "NetworkFirst", options: { cacheName: "ra-public-pages", networkTimeoutSeconds: 4, precacheFallback: { fallbackURL: "/offline.html" }, expiration: { maxEntries: 25, maxAgeSeconds: 7 * 86400 }, cacheableResponse: { statuses: [200] } } },
          { urlPattern: /^https:\/\/(tile\.openstreetmap\.org|tiles\.openseamap\.org)\//, handler: "CacheFirst", options: { cacheName: "ra-map-tiles", expiration: { maxEntries: 600, maxAgeSeconds: 30 * 86400 }, cacheableResponse: { statuses: [0, 200] } } },
          { urlPattern: ({ url }) => url.origin === self.location.origin && /\/assets\/[^/]+-[\w-]+\.(js|css|jpg|png|woff2)$/.test(url.pathname), handler: "CacheFirst", options: { cacheName: "ra-hashed-assets", expiration: { maxEntries: 100 }, cacheableResponse: { statuses: [200] } } },
        ],
      },
} satisfies Partial<VitePWAOptions>;
