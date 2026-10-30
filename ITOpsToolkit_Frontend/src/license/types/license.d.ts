export interface LicensePayload {
    iss: string;
    aud: string;
    sub: string;
    licenseId: string;
    product: string;
    edition: string;
    ver: number;
    customerName: string;
    atkVersion: string;
    sbu: string;
    edl: string;
    pdl: string;
    atkChampion: string;
    exp?: number;
    modules: Record<string, boolean>;
    features: Record<string, boolean>;
}
