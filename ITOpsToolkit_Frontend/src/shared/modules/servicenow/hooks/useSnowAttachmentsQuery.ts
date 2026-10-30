import { useQuery, type UseQueryOptions } from '@tanstack/react-query';
import { fetchSnowAttachments } from '../services/fetch-snow-attachments';
import type { SnowNormalizedAttachment } from '../types/attachment';
import type { SnowTableName } from '../types/ticket';

export interface UseSnowAttachmentsQueryParams {
    tableName: SnowTableName;
    tableSysId: string;
    enabled?: boolean;
}

export function useSnowAttachmentsQuery(params: UseSnowAttachmentsQueryParams, options?: Omit<UseQueryOptions<SnowNormalizedAttachment[], Error>, 'queryKey' | 'queryFn'>) {
    const { tableName, tableSysId, enabled = true } = params;
    const queryKey = ['snow-attachments', tableName, tableSysId];

    const query = useQuery<SnowNormalizedAttachment[], Error>({
        queryKey,
        queryFn: () => fetchSnowAttachments({ tableName, tableSysId }),
        enabled: Boolean(enabled && tableName && tableSysId),
        ...options,
    });

    return {
        ...query,
        queryKey,
    };
}
