import { useState, useEffect, useRef } from 'react';
import { Play, X, Calendar, RotateCcw, Trash2, AlertTriangle } from 'lucide-react';
import type { Video, ApiResponse } from '../types/video';
import { appConfig } from '@/config/app-config';
import UploadVideoButton from './UploadButton';
import { useAuth } from '@/shared/modules/auth/hooks/useAuth';
import FormActionModal from '@/shared/components/ui/FormActionModal/FormActionModal';
// import FormActionModal from '@/l'; // adjust path to where FormActionModal lives

const VideoPage: React.FC<unknown> = () => {
    // State Management
    const [videos, setVideos] = useState<Video[]>([]);
    const [filteredVideos, setFilteredVideos] = useState<Video[]>([]);
    const [searchTerm, setSearchTerm] = useState<string>('');
    const [loading, setLoading] = useState<boolean>(true);
    const [error, setError] = useState<string>('');
    const [selectedVideo, setSelectedVideo] = useState<Video | null>(null);
    const [deletingId, setDeletingId] = useState<string | null>(null);

    // NEW: state for the delete confirmation modal
    const [videoToDelete, setVideoToDelete] = useState<Video | null>(null);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState<boolean>(false);

    const { hasGroupMembership } = useAuth();
    const VIDEO_ADMIN = '/video-upload';
    const canDelete = hasGroupMembership(VIDEO_ADMIN);

    // Refs
    const videoRef = useRef<HTMLVideoElement>(null);
    const videoContainerRef = useRef<HTMLDivElement>(null);

    // Constants
    const API_BASE_URL: string = appConfig.backend.api.tutorial_dns || 'http://localhost:3000/api';

    // Lifecycle Hooks
    useEffect(() => {
        fetchVideos();
    }, []);

    // Handle search with debouncing
    useEffect(() => {
        const debounceTimer = setTimeout(() => {
            if (searchTerm.trim()) {
                searchVideos(searchTerm);
            } else {
                setFilteredVideos(videos);
            }
        }, 500);

        return () => clearTimeout(debounceTimer);
    }, [searchTerm, videos]);

    // API Functions
    const fetchVideos = async (): Promise<void> => {
        try {
            setLoading(true);
            setError('');
            const response: Response = await fetch(`${API_BASE_URL}/videos`);

            if (!response.ok) {
                throw new Error('Failed to fetch videos');
            }

            const data: ApiResponse = await response.json();

            if (!data.success) {
                throw new Error(data.error || 'Failed to fetch videos');
            }

            const videosList: Video[] = data.videos || [];
            setVideos(videosList);
            setFilteredVideos(videosList);
        } catch (err: unknown) {
            setError(`Failed to load videos. Please try again later..${err}`);
        } finally {
            setLoading(false);
        }
    };

    const searchVideos = async (query: string): Promise<void> => {
        try {
            setLoading(true);
            setError('');
            const response: Response = await fetch(`${API_BASE_URL}/videos?search=${encodeURIComponent(query)}`);

            if (!response.ok) {
                throw new Error('Failed to search videos');
            }

            const data: ApiResponse = await response.json();

            if (!data.success) {
                throw new Error(data.error || 'Failed to search videos');
            }

            const videosList: Video[] = data.videos || [];
            setFilteredVideos(videosList);
        } catch (err: unknown) {
            setError(`Failed to search videos.${err}`);
            setFilteredVideos([]);
        } finally {
            setLoading(false);
        }
    };

    const deleteVideo = async (video: Video): Promise<void> => {
        try {
            setDeletingId(video.id);
            setError('');

            const response: Response = await fetch(`${API_BASE_URL}/video/${encodeURIComponent(video.id)}`, {
                method: 'DELETE',
            });

            const data: ApiResponse = await response.json();

            if (!response.ok || !data.success) {
                throw new Error(data.error || 'Failed to delete video');
            }

            // Remove the deleted video from local state instead of a full refetch
            setVideos((prev) => prev.filter((v) => v.id !== video.id));
            setFilteredVideos((prev) => prev.filter((v) => v.id !== video.id));

            // If the deleted video was open in the modal, close it
            if (selectedVideo?.id === video.id) {
                closeModal();
            }
        } finally {
            setDeletingId(null);
        }
    };

    // Event Handlers

    // CHANGED: this now just opens the confirmation modal instead of deleting directly
    const handleDeleteClick = (e: React.MouseEvent, video: Video): void => {
        e.stopPropagation(); // Prevent opening the video modal
        setVideoToDelete(video);
        setIsDeleteModalOpen(true);
    };

    // NEW: called when the user cancels or closes the confirm modal
    const handleCancelDelete = (): void => {
        setIsDeleteModalOpen(false);
        setVideoToDelete(null);
    };

    // NEW: called when the user confirms deletion inside the modal
    const handleConfirmDelete = async (
        setOverlay: (state: { isLoading?: boolean; isError?: boolean; error?: Error | null; onRetry?: () => void }) => void,
        onSuccess: (params: { successMessage: string }) => void
    ): Promise<void> => {
        if (!videoToDelete) return;

        try {
            setOverlay({ isLoading: true });
            await deleteVideo(videoToDelete);
            setOverlay({ isLoading: false });
            onSuccess({ successMessage: 'Video deleted successfully' });
            setVideoToDelete(null);
        } catch (err: unknown) {
            const errorObj = err instanceof Error ? err : new Error(String(err));
            setOverlay({
                isLoading: false,
                isError: true,
                error: errorObj,
                onRetry: () => handleConfirmDelete(setOverlay, onSuccess),
            });
        }
    };

    const closeModal = (): void => {
        setSelectedVideo(null);
        if (videoRef.current) {
            videoRef.current.pause();
        }
    };

    const handleSearchChange = (value: string): void => {
        setSearchTerm(value);
    };

    const handleClearSearch = (): void => {
        setSearchTerm('');
        setFilteredVideos(videos);
    };

    const handleClearError = (): void => {
        setError('');
    };

    const handleVideoClick = (video: Video): void => {
        setSelectedVideo(video);
    };

    // Utility Functions
    const formatDate = (dateString?: string): string => {
        if (!dateString) return 'Unknown';
        try {
            return new Date(dateString).toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'short',
                day: 'numeric',
            });
        } catch {
            return 'Unknown';
        }
    };

    const getStreamUrl = (video: Video): string => {
        return `${API_BASE_URL}/stream/${encodeURIComponent(video.id)}`;
    };

    return (
        <div className="px-5 h-full overflow-y-auto">
            <div className="max-w-7xl mx-auto">
                {/* Header */}
                <div className="flex flex-col items-center text-center mt-3 mb-4 px-3">
                    <div className="mb-8">
                        <h1 className="text-4xl gradient-text-3 font-semibold tracking-wide mb-2">Demo Video Library</h1>
                    </div>
                </div>

                {/* Search Bar */}
                <div className="mb-8">
                    <div className="relative">
                        <input
                            type="text"
                            placeholder="Search videos..."
                            value={searchTerm}
                            onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleSearchChange(e.target.value)}
                            className="w-full px-4 py-3 rounded-lg bg-gray-50 text-gray-900 placeholder-gray-500 border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                        />
                        {searchTerm && (
                            <button
                                onClick={handleClearSearch}
                                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 transition"
                                aria-label="Clear search"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        )}
                    </div>
                </div>

                {/* Error Message */}
                {error && (
                    <div className="mb-6 p-4 bg-red-50 text-red-700 rounded-lg flex items-start gap-3 border border-red-200">
                        <div className="flex-1">{error}</div>
                        <button onClick={handleClearError} className="text-red-700 hover:text-red-900" aria-label="Close error message">
                            <X className="w-5 h-5" />
                        </button>
                    </div>
                )}

                {/* Loading State */}
                {loading && (
                    <div className="flex justify-center items-center py-16">
                        <div className="text-center">
                            <div className="animate-spin rounded-full h-12 w-12 border-4 border-gray-200 border-t-blue-500 mx-auto mb-4"></div>
                            <p className="text-gray-600">Loading videos...</p>
                        </div>
                    </div>
                )}

                {/* Videos Grid */}
                {!loading && (
                    <>
                        {filteredVideos.length > 0 ? (
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-6">
                                {filteredVideos.map((video) => (
                                    <div
                                        key={video.id}
                                        onClick={() => handleVideoClick(video)}
                                        className="group relative cursor-pointer rounded-lg overflow-hidden bg-white border border-gray-200 hover:border-blue-300 hover:shadow-lg transition duration-300 transform hover:scale-105"
                                    >
                                        {/* Video Thumbnail */}
                                        <div className="relative bg-gray-100 aspect-video flex items-center justify-center overflow-hidden">
                                            <div className="absolute inset-0 bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center">
                                                <Play className="w-12 h-12 text-gray-400 group-hover:text-blue-500 transition" />
                                            </div>

                                            <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-0 group-hover:bg-opacity-20 transition">
                                                <Play className="w-16 h-16 text-white opacity-0 group-hover:opacity-100 transition" />
                                            </div>

                                            {/* Delete Button */}
                                            {canDelete && (
                                                <button
                                                    onClick={(e) => handleDeleteClick(e, video)}
                                                    disabled={deletingId === video.id}
                                                    aria-label={`Delete ${video.name}`}
                                                    title="Delete video"
                                                    className="absolute top-2 right-2 p-2 rounded-full bg-black/50 text-white opacity-0 group-hover:opacity-100 hover:bg-red-600 transition disabled:opacity-50 disabled:cursor-not-allowed z-10"
                                                >
                                                    {deletingId === video.id ? (
                                                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                                    ) : (
                                                        <Trash2 className="w-4 h-4" />
                                                    )}
                                                </button>
                                            )}
                                        </div>

                                        {/* Video Info */}
                                        <div className="p-4">
                                            <h3 className="font-semibold text-sm text-gray-900 truncate group-hover:text-blue-600 transition">
                                                {video.name.replace(/\.[^.]+$/, '')}
                                            </h3>

                                            <div className="mt-3 space-y-2 text-xs text-gray-600">
                                                <div className="flex items-center gap-2">
                                                    <Calendar className="w-3 h-3 text-gray-400" />
                                                    <span>{formatDate(video.createdAt)}</span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="text-center py-16">
                                <Play className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                                <p className="text-gray-600 text-lg mb-4">{searchTerm ? 'No videos found matching your search.' : 'No videos available.'}</p>
                                {searchTerm && (
                                    <button
                                        onClick={handleClearSearch}
                                        className="px-4 py-2 bg-blue-50 hover:bg-blue-100 text-blue-600 rounded transition flex items-center gap-2 mx-auto border border-blue-200"
                                    >
                                        <RotateCcw className="w-4 h-4" />
                                        Clear Search
                                    </button>
                                )}
                            </div>
                        )}
                    </>
                )}
            </div>

            {/* Video Player Modal */}
            {selectedVideo && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50 overflow-y-auto" onClick={closeModal}>
                    <div className="w-full max-w-4xl my-8 bg-white rounded-lg" ref={videoContainerRef} onClick={(e) => e.stopPropagation()}>
                        <button onClick={closeModal} className="absolute top-15 right-4 p-2 bg-blue-500 hover:bg-blue-600 text-white rounded-full transition z-10">
                            <X className="w-6 h-6" />
                        </button>

                        <div className="bg-black rounded-t-lg overflow-hidden aspect-video">
                            <video
                                ref={videoRef}
                                controls
                                autoPlay
                                controlsList="nodownload"
                                disablePictureInPicture
                                onContextMenu={(e) => e.preventDefault()}
                                className="w-full h-full"
                            >
                                <source src={getStreamUrl(selectedVideo)} type="video/mp4" />
                                Your browser does not support the video tag.
                            </video>
                        </div>

                        <div className="p-6">
                            <div className="flex items-center gap-2">
                                <h2 className="text-2xl font-bold text-blue-900">{selectedVideo.name.replace(/\.[^.]+$/, '')}</h2>

                                <div className="flex ">
                                    <div className="text-gray-600 text-xs flex items-center gap-2">
                                        <Calendar className="w-4 h-4 text-blue-500" />
                                        Uploaded,
                                    </div>
                                    <div className=" flex items-center gap-2 text-gray-600 text-xs">{formatDate(selectedVideo.createdAt)}</div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* NEW: Delete Confirmation Modal (uses FormActionModal) */}
            <FormActionModal
                open={isDeleteModalOpen}
                onClose={handleCancelDelete}
                title="Delete Video"
                formSize="sm"
                successSize="sm"
                successConfig={{ title: 'Video deleted successfully' }}
            >
                {({ onSuccess, onClose, setOverlay }) => (
                    <div className="flex flex-col items-center gap-4 px-6 py-6 text-center">
                        <div className="flex items-center justify-center size-14 rounded-full bg-red-100">
                            <AlertTriangle size={28} className="text-red-600" />
                        </div>

                        <div>
                            <h3 className="text-sm 2xl:text-base font-semibold text-gray-900">
                                Are you sure you want to delete{videoToDelete ? ` "${videoToDelete.name.replace(/\.[^.]+$/, '')}"` : ' this video'}?
                            </h3>
                            <p className="mt-1 text-xs 2xl:text-sm text-gray-500">This action cannot be undone.</p>
                        </div>

                        <div className="flex items-center justify-center gap-3 mt-2 w-full">
                            <button
                                onClick={onClose}
                                className="flex-1 px-4 py-2 rounded-lg border border-gray-300 text-gray-700 text-sm font-medium hover:bg-gray-50 transition"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={() => handleConfirmDelete(setOverlay, onSuccess)}
                                className="flex-1 px-4 py-2 rounded-lg bg-red-600 text-white text-sm font-medium hover:bg-red-700 transition"
                            >
                                Yes, Delete
                            </button>
                        </div>
                    </div>
                )}
            </FormActionModal>

            <UploadVideoButton refetchVideos={fetchVideos} />
        </div>
    );
};

export default VideoPage;