export interface SnowAttachmentItem {
    sys_id: string | { display_value?: string; value?: string };
    file_name: string | { display_value?: string; value?: string };
    content_type?: string | { display_value?: string; value?: string };
    size_bytes?: string | number | { display_value?: string; value?: string };
    table_name?: string | { display_value?: string; value?: string };
    table_sys_id?: string | { display_value?: string; value?: string };
    sys_created_on?: string | { display_value?: string; value?: string };
    sys_created_by?: string | { display_value?: string; value?: string };
    download_link?: string;
    [key: string]: unknown;
}

export interface SnowNormalizedAttachment {
    sys_id: string;
    file_name: string;
    content_type: string;
    size_bytes: number;
    table_name: string;
    table_sys_id: string;
    sys_created_on: string;
    sys_created_by: string;
    download_link: string;
}
