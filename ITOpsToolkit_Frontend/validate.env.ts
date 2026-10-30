import envSchema from './env.schema.ts';

export default function validateEnv(env: Record<string, string>): Record<string, string> {
    const result = envSchema.safeParse(env);

    if (!result.success) {
        // eslint-disable-next-line no-console
        console.error('Environment variable validation failed with the following issues:' + result.error.issues.length);

        result.error.issues.forEach((issue) => {
            // eslint-disable-next-line no-console
            console.error('• ' + issue.message + ' (at ' + issue.path.join('.') + ')');
        });

        throw new Error('Invalid environment variables. Please fix the above issues and restart the application.');
    }

    return result.data;
}
