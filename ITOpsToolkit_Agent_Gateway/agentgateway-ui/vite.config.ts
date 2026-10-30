import { defineConfig } from "vite";
import { loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import { fileURLToPath, URL } from "node:url";

function normalizeBaseUrl(value: string): string {
  const trimmed = value.trim().replace(/\/$/, "");
  if (!trimmed) return "";
  if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) {
    return trimmed;
  }
  return `https://${trimmed}`;
}

export default defineConfig(({ command, mode }) => {
  const env = loadEnv(mode, process.cwd(), "");

  const agwBase = normalizeBaseUrl(env.AGW_DOMAIN || env.VITE_AGW_URL || "");
  const keycloakPath = (env.KEYCLOAK_PATH || "/auth").startsWith("/")
    ? env.KEYCLOAK_PATH || "/auth"
    : `/${env.KEYCLOAK_PATH}`;
  const keycloakUrl = (env.KEYCLOAK_URL || "").trim() || (agwBase ? `${agwBase}${keycloakPath}` : "");
  const keycloakRealm = (env.KEYCLOAK_REALM || "fasteai").trim();
  const keycloakClientId = (env.KEYCLOAK_CLIENT_ID || "fasteai").trim();

  const devProxy = agwBase
    ? {
        "/api": { target: agwBase, changeOrigin: true, secure: false },
        "/config_dump": { target: agwBase, changeOrigin: true, secure: false },
        "/config": { target: agwBase, changeOrigin: true, secure: false },
        "/logging": { target: agwBase, changeOrigin: true, secure: false },
        "/memory": { target: agwBase, changeOrigin: true, secure: false },
        "/cel": { target: agwBase, changeOrigin: true, secure: false },
        "/debug": { target: agwBase, changeOrigin: true, secure: false },
      }
    : undefined;

  return {
    base: env.VITE_BASE_PATH ?? (command === "build" ? "/ui/" : "./"),
    plugins: [
      react(),
      {
        name: "local-keycloak-config",
        configureServer(server) {
          server.middlewares.use((req, res, next) => {
            const url = req.url?.split("?")[0];
            if (url === "/config.json" || url === "/app-config.json") {
              const config = {
                keycloak: {
                  url: keycloakUrl,
                  realm: keycloakRealm,
                  clientId: keycloakClientId,
                },
              };
              res.setHeader("Content-Type", "application/json");
              res.end(JSON.stringify(config));
              return;
            }
            next();
          });
        },
      },
    ],
    resolve: {
      alias: {
        "@": fileURLToPath(new URL("./src", import.meta.url)),
        "path-browserify": fileURLToPath(
          new URL("./src/pathBrowserifyEsm.ts", import.meta.url),
        ),
      },
    },
    build: {
      outDir: "out",
      emptyOutDir: true,
      reportCompressedSize: false,
      sourcemap: false,
      chunkSizeWarningLimit: 5000,
    },
    server: {
      port: 19000,
      strictPort: false,
      proxy: devProxy,
    },
  };
});
