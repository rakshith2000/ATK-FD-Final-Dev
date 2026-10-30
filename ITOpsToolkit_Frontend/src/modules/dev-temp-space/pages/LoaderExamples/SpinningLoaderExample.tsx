import { LoadingPlaceholder } from '@/shared/components/ui/Placeholders';

export default function SpinnerLoaderExample() {
    return (
        <div style={{ display: 'flex', gap: '10px', padding: '10px', alignItems: 'center' }}>
            {/* Default Loader */}
            <LoadingPlaceholder iconSize={280} />

            {/* Custom Size & Color */}
            <LoadingPlaceholder iconSize={200} color="#8b5cf6" accentColor="#ec4899" speed="1s" />

            {/* Large Purple Loader */}
            <LoadingPlaceholder iconSize={150} speed="3s" colors={['#f43f5e', '#06b6d4', '#10b981', '#f59e0b', '#6366f1', '#ec4899', '#84cc16', '#3b82f6']} />
            {/* Sunset Palette */}
            <LoadingPlaceholder iconSize={140} speed="1.8s" message="Syncing data..." colors={['#ff4e50', '#f9d423', '#e14eca', '#f06292', '#ba68c8', '#9c27b0', '#ff9800']} />

            {/* Neon Cyberpunk Palette */}
            <LoadingPlaceholder iconSize={160} speed="1.5s" message="Connecting..." colors={['#00f5d4', '#7b2cbf', '#f72585', '#4cc9f0', '#4361ee', '#3a0ca3', '#7209b7']} />

            {/* Forest Emerald Palette */}
            <LoadingPlaceholder iconSize={120} speed="2s" message="Saving changes..." colors={['#10b981', '#059669', '#047857', '#065f46', '#34d399', '#6ee7b7', '#a7f3d0']} />
        </div>
    );
}
