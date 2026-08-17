import { defineConfig, loadEnv } from 'vite';
import react, { reactCompilerPreset } from '@vitejs/plugin-react';
import babel from '@rolldown/plugin-babel';
import tailwindcss from '@tailwindcss/vite';
import { tanstackRouter } from '@tanstack/router-plugin/vite';
import path from 'node:path';


export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, process.cwd(), '');

    return {
        plugins: [
            tanstackRouter({ target: 'react', autoCodeSplitting: true }),
            react(),
            babel({
                presets: [reactCompilerPreset()],
                }
            ),
            tailwindcss(),
        ],
        resolve: {
            alias: {
                '@': path.resolve(import.meta.dirname, './src'),
            },
        },
        server: {
            proxy: env.VITE_API_TARGET
                ? {
                      '/api': {
                          target: env.VITE_API_TARGET,
                          changeOrigin: true,
                          rewrite: (requestPath) => requestPath.replace(/^\/api/, ''),
                      },
                  }
                : undefined,
        },
    };
});