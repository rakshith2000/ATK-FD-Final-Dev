import z from 'zod';

export const requiredString512Chars = (message: string) => z.string().trim().min(1, message).max(512, 'Value is too long, maximum 512 characters allowed');

export const httpsUrlSchema = (requiredMessage: string, invalidMessage: string, onlyHttps = false) =>
    z
        .string()
        .trim()
        .min(1, requiredMessage)
        .url(invalidMessage)
        .refine((value) => (onlyHttps ? value.startsWith('https://') : value.startsWith('https://') || value.startsWith('http://')), {
            message: onlyHttps ? 'URL must start with https://' : 'URL must start with http:// or https://',
        });
