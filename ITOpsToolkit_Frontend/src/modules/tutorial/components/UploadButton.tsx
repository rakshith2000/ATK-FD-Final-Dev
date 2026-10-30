import React from 'react';
import type { ChangeEvent } from "react";
import { useVideoAPI } from '../hooks/useVideoAPI'
import { Plus, Loader2 } from 'lucide-react';
import { useAuth } from '@/shared/modules/auth/hooks/useAuth';

interface UploadVideoButtonProps {
    refetchVideos: () => void | Promise<void>;
}

const UploadVideoButton: React.FC<UploadVideoButtonProps> = ({ refetchVideos }) => {

    const { hasGroupMembership } = useAuth();
    const VIDEO_ADMIN = '/video-upload';
    const canUpload = hasGroupMembership(VIDEO_ADMIN);

    const {
        uploadVideo,
        uploading,
        error,
    } = useVideoAPI();




    const handleUpload = async (
        event: ChangeEvent<HTMLInputElement>,
    ): Promise<void> => {
        const file = event.target.files?.[0];

        if (!file) return;

        try {
            await uploadVideo(file);
            await refetchVideos();
        } catch (err) {
            event.target.value = '';
        } finally {
            event.target.value = '';
        }
    };

    if (!canUpload) {
        return <></>
    }

    return (
        <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-2">
            <label
                htmlFor="video-upload"
                className={`
                    group inline-flex items-center gap-2 rounded-full 
                    bg-blue-600 px-4 py-3 text-sm font-semibold text-white 
                    shadow-lg shadow-blue-600/30 transition-all duration-200
                    hover:bg-blue-700 hover:shadow-xl hover:shadow-blue-600/40
                    active:scale-95
                    ${uploading
                        ? 'cursor-not-allowed bg-gray-400 shadow-gray-400/30 hover:bg-gray-400'
                        : 'cursor-pointer'
                    }
                `}
            >
                {uploading ? (
                    <Loader2 className="size-4 animate-spin" />
                ) : (
                    <Plus className="size-4 transition-transform duration-200 group-hover:rotate-90" />
                )}
                <span>{uploading ? 'Uploading...' : 'Upload'}</span>
            </label>

            <input
                id="video-upload"
                type="file"
                accept="video/*"
                className="hidden"
                disabled={uploading}
                onChange={handleUpload}
            />

            {error && (
                <p className="rounded-md bg-white px-3 py-1.5 text-sm text-red-500 shadow-md">
                    {String(error)}
                </p>
            )}
        </div>
    );
};

export default UploadVideoButton;