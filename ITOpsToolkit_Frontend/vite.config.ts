import { URL, fileURLToPath } from 'node:url';
import { defineConfig, loadEnv } from 'vite';
import { devtools } from '@tanstack/devtools-vite';
import viteReact from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import autoprefixer from 'autoprefixer';
import { tanstackRouter } from '@tanstack/router-plugin/vite';
import validateEnv from './validate.env.ts';
import svgr from 'vite-plugin-svgr';

// import { readFileSync } from 'node:fs';

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
    const appEnv = validateEnv(loadEnv(mode, process.cwd()));

    const isDev = mode === 'development';

    return {
        base: appEnv['VITE_APP_BASE_PATH'],
        plugins: [
            svgr(),
            tailwindcss(),
            devtools({ removeDevtoolsOnBuild: true }),
            tanstackRouter({
                target: 'react',
                autoCodeSplitting: true,
                routesDirectory: './src/routes',
                generatedRouteTree: './src/routeTree.gen.ts',
            }),
            viteReact(),
        ],
        css: {
            postcss: {
                plugins: [autoprefixer()],
            },
        },
        build: {
            chunkSizeWarningLimit: 3500,
            cssMinify: 'lightningcss',
            rolldownOptions: {
                output: {
                    minify: !isDev,
                    manualChunks: (id: string) => {
                        if (id.includes('node_modules')) {
                            if (id.includes('@tanstack/react-devtools')) return 'vendor-react-devtools';
                            if (id.includes('@tanstack/react-router-devtools')) return 'vendor-router-devtools';
                            if (id.includes('@tanstack/react-query-devtools')) return 'vendor-query-devtools';
                            if (id.includes('@tanstack/react-form-devtools')) return 'vendor-form-devtools';
                            if (id.includes('devtools') || id.includes('-devtools')) return 'vendor-devtools';
                            if (id.includes('react-dom') || id.includes('react-error-boundary')) return 'vendor-react';
                            if (id.includes('react/')) return 'vendor-react';
                            if (id.includes('@tanstack/react-router')) return 'vendor-router';
                            if (id.includes('@tanstack/react-query')) return 'vendor-query';
                            if (id.includes('@reduxjs/toolkit') || id.includes('react-redux')) return 'vendor-redux';
                            if (id.includes('@tanstack/react-form') || id.includes('@tanstack/zod-form-adapter') || id.includes('zod')) return 'vendor-forms';
                            if (id.includes('@tanstack/react-table') || id.includes('@tanstack/react-virtual')) return 'vendor-table';
                            if (id.includes('@mui/icons-material')) return 'vendor-mui-icons';
                            if (id.includes('@mui/material') || id.includes('@emotion')) return 'vendor-mui-core';
                            if (id.includes('@mui')) return 'vendor-mui-misc';
                            if (id.includes('lucide-react') || id.includes('react-icons')) return 'vendor-icons';
                            if (id.includes('keycloak-js') || id.includes('@azure/msal') || id.includes('jose') || id.includes('jwt-decode')) return 'vendor-auth';
                            if (id.includes('lexical')) return 'vendor-lexical';
                            if (id.includes('react-markdown') || id.includes('remark') || id.includes('rehype')) return 'vendor-markdown';
                            if (
                                id.includes('mermaid') ||
                                id.includes('cytoscape') ||
                                id.includes('dagre') ||
                                id.includes('katex') ||
                                id.includes('roughjs') ||
                                id.includes('khroma') ||
                                id.includes('stylis') ||
                                id.includes('marked') ||
                                id.includes('ts-dedent') ||
                                id.includes('@iconify') ||
                                id.includes('@braintree/sanitize-url') ||
                                id.includes('@upsetjs') ||
                                id.includes('d3-sankey') ||
                                id.includes('es-toolkit') ||
                                id.includes('fastdom')
                            )
                                return 'vendor-mermaid';
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
                            if (id.includes('@base-ui')) return 'vendor-base-ui';
                            if (id.includes('d3')) return 'vendor-d3';
                            if (id.includes('motion')) return 'vendor-motion';
                            if (id.includes('zustand')) return 'vendor-zustand';

                            return 'vendor-misc';
                        }
                    },
                    chunkFileNames: 'assets/js/[hash].js',
                    entryFileNames: 'assets/js/[hash].js',
                    assetFileNames: (assetInfo) => {
                        const ext = assetInfo.names?.[0]?.split('.').pop() ?? 'asset';
                        if (['png', 'jpg', 'jpeg', 'gif', 'svg', 'webp', 'ico'].includes(ext)) {
                            return 'assets/img/[hash].[ext]';
                        }
                        if (['woff', 'woff2', 'ttf', 'eot'].includes(ext)) {
                            return 'assets/fonts/[hash].[ext]';
                        }
                        if (ext === 'css') {
                            return 'assets/css/[hash].[ext]';
                        }
                        return 'assets/[hash].[ext]';
                    },
                },
            },
        },
        resolve: {
            alias: {
                '@': fileURLToPath(new URL('./src', import.meta.url)),
            },
        },
        server: {
            host: true,
            port: 4000,
            strictPort: true,
            cors: true,
            // https: {
            //     key: readFileSync('key.pem'),
            //     cert: readFileSync('cert.pem'),
            // },
        },
    };
});
