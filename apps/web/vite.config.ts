import { fileURLToPath } from 'node:url';
import { defineConfig, loadEnv } from 'vite';
import viteReact from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { TanStackRouterVite } from '@tanstack/router-plugin/vite';

const sourceDir = fileURLToPath(new URL('./src', import.meta.url));

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const port = Number(
    process.env.VITE_PORT ||
      env.VITE_PORT ||
      process.env.PORT ||
      env.PORT ||
      5180,
  );
  const host =
    process.env.VITE_HOST ||
    env.VITE_HOST ||
    process.env.HOST ||
    env.HOST ||
    true;
  const backendTarget =
    process.env.VITE_BACKEND_PROXY_TARGET ||
    env.VITE_BACKEND_PROXY_TARGET ||
    process.env.BACKEND_URL ||
    env.BACKEND_URL ||
    'http://localhost:3001';

  return {
    plugins: [
      TanStackRouterVite({
        routesDirectory: './src/routes',
        generatedRouteTree: './src/routeTree.gen.ts',
        routeFileIgnorePattern: '.*\\.(test|spec)\\.(ts|tsx)$|__tests__',
      }),
      tailwindcss(),
      viteReact(),
    ],
    resolve: {
      alias: {
        '@': sourceDir,
      },
    },
    server: {
      port,
      host,
      allowedHosts: true,
      watch: {
        ignored: [
          '**/coverage/**',
          '**/dist/**',
          '**/__tests__/**',
          '**/*.test.*',
        ],
      },
      proxy: {
        '/api': {
          target: backendTarget,
          changeOrigin: true,
        },
        '/socket.io': {
          target: backendTarget,
          ws: true,
          changeOrigin: true,
        },
      },
    },
  };
});
