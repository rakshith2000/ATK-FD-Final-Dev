import { URL, fileURLToPath } from 'node:url';
import { defineConfig, loadEnv } from 'vite';
import viteReact from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import autoprefixer from 'autoprefixer';
import svgr from 'vite-plugin-svgr';
import validateEnv from './validate.env';

/**
 * Separate Vite config for building the MFE remote entry.
 * Produces a single ESM file at dist/itops-mfe/itops-mfe-remote-entry.js that exports mountItopsMfeRoute.
 *
 * Style isolation is handled by Shadow DOM at runtime -
 * no postcss-prefix-selector or layer unwrapping needed.
 */
export default defineConfig(() => {
    const appEnv = validateEnv(loadEnv('production', process.cwd()));

    return {
        mode: 'production',
        base: appEnv['VITE_APP_BASE_PATH'],
        define: {
            'process.env.NODE_ENV': JSON.stringify('production'),
            'process.env': JSON.stringify({}),
        },
        plugins: [svgr(), tailwindcss(), viteReact()],
        css: {
            postcss: {
                plugins: [autoprefixer()],
            },
        },
        resolve: {
            alias: {
                '@': fileURLToPath(new URL('./src', import.meta.url)),
            },
        },
        build: {
            outDir: 'dist/itops-mfe',
            emptyOutDir: false,
            cssMinify: false,
            lib: {
                entry: './src/itops-mfe/index.ts',
                formats: ['es'],
                fileName: () => 'itops-mfe-remote-entry.js',
            },
            rolldownOptions: {
                external: [],
                output: {
                    codeSplitting: true,
                    chunkFileNames: 'chunks/[hash].js',
                    manualChunks: (id: string) => {
                        if (id.includes('node_modules')) {
                            if (id.includes('react-dom') || id.includes('react-error-boundary')) return 'vendor-react';
                            if (id.includes('react/')) return 'vendor-react';
                            if (id.includes('@tanstack/react-router')) return 'vendor-router';
                            if (id.includes('@tanstack/react-query')) return 'vendor-query';
                            if (id.includes('@tanstack/react-form') || id.includes('@tanstack/zod-form-adapter') || id.includes('zod')) return 'vendor-forms';
                            if (id.includes('@tanstack/react-table') || id.includes('@tanstack/react-virtual')) return 'vendor-table';
                            if (id.includes('@mui/icons-material')) return 'vendor-mui-icons';
                            if (id.includes('@mui/material') || id.includes('@emotion')) return 'vendor-mui-core';
                            if (id.includes('lucide-react') || id.includes('react-icons')) return 'vendor-icons';
                            if (id.includes('keycloak-js') || id.includes('@azure/msal') || id.includes('jose') || id.includes('jwt-decode')) return 'vendor-auth';
                            if (id.includes('lexical')) return 'vendor-lexical';
                            if (id.includes('react-markdown') || id.includes('remark') || id.includes('rehype')) return 'vendor-markdown';
                            if (id.includes('mermaid')) return 'vendor-mermaid';
                            if (id.includes('chart.js') || id.includes('react-chartjs-2')) return 'vendor-chart-js';
                            if (id.includes('reactflow')) return 'vendor-reactflow';
                            if (id.includes('axios')) return 'vendor-http';
                            if (
                                id.includes('mitt') ||
                                id.includes('dompurify') ||
                                id.includes('tailwind-merge') ||
                                id.includes('clsx') ||
                                id.includes('class-variance-authority') ||
                                id.includes('dayjs')
                            )
                                return 'vendor-utils';
                            if (id.includes('framer-motion')) return 'vendor-animation';
                            if (id.includes('recharts')) return 'vendor-charts';
                            return 'vendor-misc';
                        }
                    },
                    assetFileNames: (assetInfo) => {
                        const ext = assetInfo.names?.[0]?.split('.').pop() ?? 'asset';
                        if (ext === 'css') return 'assets/itops-mfe-styles.css';
                        return 'assets/[name].[ext]';
                    },
                },
            },
        },
    };
});
