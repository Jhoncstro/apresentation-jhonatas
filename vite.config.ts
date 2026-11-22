import { defineConfig } from "vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import tsconfigPaths from "vite-tsconfig-paths";

// Firebase Hosting serves static files; no Lovable build plugin or runtime server.
export default defineConfig({
  plugins: [
    tsconfigPaths(),
    tanstackStart({
      server: { entry: "server" },
      spa: { enabled: true, maskPath: "/app" },
      pages: ["/", "/projetos", "/sobre", "/contato"].map((path) => ({ path })),
      prerender: {
        enabled: true,
        autoStaticPathsDiscovery: false,
        crawlLinks: false,
        failOnError: true,
      },
    }),
    react(),
    tailwindcss(),
  ],
});
