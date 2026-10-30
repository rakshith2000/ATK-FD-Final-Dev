import { defineConfig, mergeConfig } from 'vitest/config';
import viteConfig from './vite.config.ts';

export default defineConfig((configEnv) => {
    return mergeConfig(
        viteConfig(configEnv),
        defineConfig({
            test: {
                environment: 'jsdom',
                globals: true,
                setupFiles: './src/setupTests.ts',
                coverage: {
                    reporter: ['text', 'lcov', 'html', 'cobertura'],
                },
                include: ['src/*.test.ts', 'src/**/__tests__/*.test.tsx', 'src/**/__tests__/*.test.ts'],
                exclude: ['src/main.tsx', 'src/vite-env.d.ts', 'src/setupTests.ts'], // Files to exclude
            },
        }),
    );
});
