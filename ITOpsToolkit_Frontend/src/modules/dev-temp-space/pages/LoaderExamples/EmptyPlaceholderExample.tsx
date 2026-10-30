import EmptyPlaceholder from '@/shared/components/ui/Placeholders/EmptyPlaceholder';
import React from 'react';

export default function EmptyBoxPlaceholderExample(): React.ReactElement {
    return (
        <div
            style={{
                display: 'flex',
                flexDirection: 'row' /* Forces a row layout */,
                alignItems: 'center' /* Centers them vertically */,
                justifyContent: 'center',
                gap: '10px',
                padding: '10px',
                overflowX: 'auto' /* Adds horizontal scroll if the 500px icon gets too wide */,
            }}
        >
            {/* 1. Default Yellow Box (exact video style) */}
            <EmptyPlaceholder iconSize={100} color="#f99f1b" speed={1} />

            {/* Blue Theme, 2x Faster Animation Speed */}
            <EmptyPlaceholder iconSize={250} color="#3B82F6" speed={2} />

            {/* Emerald Green Theme, Slow Motion */}
            <EmptyPlaceholder iconSize={500} color="#10B981" speed={0.5} />
        </div>
    );
}
