import babel from 'vite-plugin-babel';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
    plugins: [
        react(),
        babel({
            babelConfig: {
                plugins: ['babel-plugin-react-compiler'],
            },
        }),
    ],
});