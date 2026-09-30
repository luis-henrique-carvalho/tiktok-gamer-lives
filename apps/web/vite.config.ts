import { fileURLToPath } from 'node:url';
import { defineConfig, loadEnv } from 'vite';
import viteReact from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { TanStackRouterVite } from '@tanstack/router-plugin/vite';

const sourceDir = fileURLToPath(new URL('./src', import.meta.url));

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const backendTarget =
    process.env.VITE_BACKEND_PROXY_TARGET ||
    env.VITE_BACKEND_PROXY_TARGET ||
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
      port: 5176,
      host: true,
      proxy: {
        '/api': {
          target: backendTarget,
          changeOrigin: true,
        },
      },
    },
  };
});
