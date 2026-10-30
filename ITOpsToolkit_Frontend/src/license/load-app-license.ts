import { resolvePublicAssetPath } from '@/shared/utils/resolve-public-asset-path';

export async function loadAppLicense(): Promise<string> {
    const response = await fetch(resolvePublicAssetPath('/license.txt'));
    if (!response.ok) {
        throw new Error(`Failed to load license.txt: ${response.status} ${response.statusText}`);
    }
    const data = await response.text();

    return data;
}
