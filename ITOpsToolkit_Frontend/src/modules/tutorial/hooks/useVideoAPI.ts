import { appConfig } from '@/config/app-config';
import { useState, useCallback } from 'react';
import globalAlertDialogEventBus from '@/shared/components/smart/GlobalAlertDialog/global-alert-dialog-event-bus';

const API_BASE_URL: string = appConfig.backend.api.tutorial_dns || 'http://localhost:3000/api';

export interface Video {
    id: string;
    name: string;
    size?: number;
    sizeFormatted?: string;
    path?: string;
    [key: string]: unknown;
}

export interface VideoInfo {
    [key: string]: unknown;
}

interface UploadResponse {
    success?: boolean;
    error?: string;
    video?: {
        name: string;
        size?: number;
        sizeFormatted?: string;
        path?: string;
        [key: string]: unknown;
    };
    [key: string]: unknown;
}

interface FetchVideosResponse {
    success: boolean;
    error?: string;
    videos?: Video[];
}

interface VideoInfoResponse {
    success: boolean;
    error?: string;
    video?: VideoInfo;
}

interface DeleteVideoResponse {
    success: boolean;
    error?: string;
}

export interface UseVideoAPIReturn {
    videos: Video[];
    loading: boolean;
    uploading: boolean;
    // uploadProgress: number;
    error: string;
    fetchVideos: () => Promise<Video[]>;
    searchVideos: (query: string) => Promise<Video[]>;
    getVideoInfo: (videoId: string) => Promise<VideoInfo | null>;
    deleteVideo: (videoId: string) => Promise<boolean>;
    uploadVideo: (file: File) => Promise<UploadResponse>;
    getStreamUrl: (video: Video) => string;
    setError: React.Dispatch<React.SetStateAction<string>>;
}

export const useVideoAPI = (): UseVideoAPIReturn => {
    const [videos, setVideos] = useState<Video[]>([]);
    const [loading, setLoading] = useState<boolean>(false);
    const [error, setError] = useState<string>('');

    const [uploading, setUploading] = useState<boolean>(false);
    // const [uploadProgress, setUploadProgress] = useState<number>(0);

    const uploadVideo = useCallback(async (file: File): Promise<UploadResponse> => {
        try {
            setUploading(true);
            setError('');

            const formData = new FormData();
            formData.append('video', file);

            const response = await fetch(`${API_BASE_URL}/upload`, {
                method: 'POST',
                body: formData,
            });

            const data: UploadResponse = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Failed to upload video');
            } else {
                globalAlertDialogEventBus.emit('show-dialog', {
                    title: 'File Upload Sucessfull',
                    note: '',
                    severity: 'success',
                });
            }

            // Optional: Immediately add uploaded video to list
            if (data.video) {
                setVideos((prev) => [
                    {
                        id: data.video!.name,
                        name: data.video!.name,
                        size: data.video!.size,
                        sizeFormatted: data.video!.sizeFormatted,
                        path: data.video!.path,
                    },
                    ...prev,
                ]);
            }

            return data;
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : String(err);
            setError(`Failed to upload video. ${errorMessage}`);
            throw err;
        } finally {
            setUploading(false);
        }
    }, []);

    const fetchVideos = useCallback(async (): Promise<Video[]> => {
        try {
            setLoading(true);
            setError('');
            const response = await fetch(`${API_BASE_URL}/videos`);

            if (!response.ok) {
                throw new Error('Failed to fetch videos');
            }

            const data: FetchVideosResponse = await response.json();

            if (!data.success) {
                throw new Error(data.error || 'Failed to fetch videos');
            }

            const videosList = data.videos || [];
            setVideos(videosList);
            return videosList;
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : String(err);
            setError(errorMessage);
            return [];
        } finally {
            setLoading(false);
        }
    }, []);

    const searchVideos = useCallback(
        async (query: string): Promise<Video[]> => {
            if (!query.trim()) {
                return videos;
            }

            try {
                setLoading(true);
                setError('');
                const response = await fetch(`${API_BASE_URL}/videos?search=${encodeURIComponent(query)}`);

                if (!response.ok) {
                    throw new Error('Failed to search videos');
                }

                const data: FetchVideosResponse = await response.json();

                if (!data.success) {
                    throw new Error(data.error || 'Failed to search videos');
                }

                const videosList = data.videos || [];
                return videosList;
            } catch (err) {
                setError(`Failed to search videos. ${err}`);
                return [];
            } finally {
                setLoading(false);
            }
        },
        [videos],
    );

    const getVideoInfo = useCallback(async (videoId: string): Promise<VideoInfo | null> => {
        try {
            // videoId is already the filename
            const response = await fetch(`${API_BASE_URL}/video/${encodeURIComponent(videoId)}/info`);

            if (!response.ok) {
                throw new Error('Failed to fetch video info');
            }

            const data: VideoInfoResponse = await response.json();

            if (!data.success) {
                throw new Error(data.error || 'Failed to fetch video info');
            }

            // Server wraps video info in a 'video' property
            return data.video || null;
        } catch (err) {
            setError(`Failed to search videos. ${err}`);
            return null;
        }
    }, []);

    const deleteVideo = useCallback(async (videoId: string): Promise<boolean> => {
        try {
            const response = await fetch(`${API_BASE_URL}/video/${encodeURIComponent(videoId)}`, {
                method: 'DELETE',
            });

            if (!response.ok) {
                throw new Error('Failed to delete video');
            }

            const data: DeleteVideoResponse = await response.json();

            if (!data.success) {
                throw new Error(data.error || 'Failed to delete video');
            }

            // Update local videos list
            setVideos((prevVideos) => prevVideos.filter((v) => v.id !== videoId));

            return true;
        } catch (err) {
            setError(`Failed to delete video. ${err}`);
            return false;
        }
    }, []);

    const getStreamUrl = useCallback((video: Video): string => {
        // Use the path from the API response (already encoded)
        // if (video.path) {
        //     // Path is already relative, make it absolute
        //     return `http://localhost:3000${video.path}`;
        // }
        // Fallback
        return `${API_BASE_URL}/stream/${encodeURIComponent(video.id)}`;
    }, []);

    return {
        videos,
        loading,
        uploading,
        // uploadProgress,
        error,
        fetchVideos,
        searchVideos,
        getVideoInfo,
        deleteVideo,
        uploadVideo,
        getStreamUrl,
        setError,
    };
};
