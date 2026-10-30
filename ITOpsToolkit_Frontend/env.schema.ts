import { z } from 'zod';

const envSchema = z.object({
    VITE_APP_PIPELINE_STAGE: z.enum(['development', 'test', 'uat', 'production'], {
        message: 'VITE_APP_PIPELINE_STAGE must be one of development, test, uat, production',
    }),

    VITE_APP_BASE_PATH: z
        .string()
        .trim()
        .min(1, 'VITE_APP_BASE_PATH is required')
        .refine((value) => value.startsWith('/'), {
            message: 'VITE_APP_BASE_PATH must start with /',
        })
        .refine((value) => value.endsWith('/'), {
            message: 'VITE_APP_BASE_PATH must end with /',
        }),

    VITE_ENABLE_DOCS_PAGE: z.enum(['true', 'false'], {
        message: 'VITE_ENABLE_DOCS_PAGE must be "true" or "false"',
    }),

    VITE_ENABLE_DEV_SPACE_PAGE: z.enum(['true', 'false'], {
        message: 'VITE_ENABLE_DEV_SPACE_PAGE must be "true" or "false"',
    }),
    VITE_ENABLE_SITE_MAP_PAGE: z.enum(['true', 'false'], {
        message: 'VITE_ENABLE_SITE_MAP_PAGE must be "true" or "false"',
    }),
});

export default envSchema;
