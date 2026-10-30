import type { SnowAttachmentItem, SnowNormalizedAttachment } from '../types/attachment';

export function normalizeSnowAttachment(item: SnowAttachmentItem): SnowNormalizedAttachment {
    const getVal = (val: unknown): string => {
        if (typeof val === 'object' && val !== null && 'display_value' in val) {
            return String((val as { display_value?: string }).display_value || (val as { value?: string }).value || '');
        }
        if (typeof val === 'object' && val !== null && 'value' in val) {
            return String((val as { value?: string }).value || '');
        }
        return String(val ?? '');
    };

    const sysId = getVal(item.sys_id);
    const rawSize = getVal(item.size_bytes);
    const sizeBytes = parseInt(rawSize, 10) || 0;

    return {
        sys_id: sysId,
        file_name: getVal(item.file_name) || 'unnamed_file',
        content_type: getVal(item.content_type) || 'application/octet-stream',
        size_bytes: sizeBytes,
        table_name: getVal(item.table_name),
        table_sys_id: getVal(item.table_sys_id),
        sys_created_on: getVal(item.sys_created_on),
        sys_created_by: getVal(item.sys_created_by),
        download_link: item.download_link || `/api/now/attachment/${sysId}/file`,
    };
}
