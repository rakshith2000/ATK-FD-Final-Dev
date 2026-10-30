import { schedulerAxios } from '@/api/axios-clients/fasteai/fasteai-api-client';
import type { SopItem } from '../types/types';

const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null;

export const fetchSops = async (): Promise<SopItem[]> => {
    const res = await schedulerAxios.get(`/sops`);
    const rawData: unknown = res.data;
    if (Array.isArray(rawData)) return rawData as SopItem[];
    if (isRecord(rawData) && Array.isArray(rawData.result)) return rawData.result as SopItem[];
    if (isRecord(rawData) && Array.isArray(rawData.data)) return rawData.data as SopItem[];
    return [];
};
