const files = import.meta.glob('../../public.pem', { eager: true, query: '?raw', import: 'default' });
export const LICENSE_PUBLIC_KEY = (files['../../public.pem'] as string) ?? '';
