/**
 * Represents a single video object
 */
export interface Video {
    id: string;
    name: string;
    path?: string;
    sizeFormatted: string;
    createdAt?: string;
}

/**
 * Represents the API response structure for video endpoints
 */
export interface ApiResponse {
    success: boolean;
    videos?: Video[];
    error?: string;
}
