import { useState } from 'react';
import { appConfig } from '@/config/app-config';
import LoadingPlaceholder from '@/shared/components/ui/Placeholders/LoadingPlaceholder';
import ErrorPlaceholder from '@/shared/components/ui/Placeholders/ErrorPlaceholder';

const AgentGatewayEmbed: React.FC = () => {
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<Error | null>(null);

    const agentGatewayIframeUrl = appConfig?.iframes?.agentGateway;

    if (typeof agentGatewayIframeUrl !== 'string' || agentGatewayIframeUrl.length <= 2 || !agentGatewayIframeUrl.startsWith('http')) {
        return <ErrorPlaceholder error={new Error(`Invalid Agent Gateway URL : ${agentGatewayIframeUrl}`)} />;
    }

    return (
        <div className="relative w-full h-full min-h-[75vh]">
            {isLoading && <LoadingPlaceholder overlay message="Loading Agent Gateway..." />}
            {error && (
                <ErrorPlaceholder
                    overlay
                    error={error}
                    onRetry={() => {
                        setError(null);
                        setIsLoading(true);
                    }}
                />
            )}
            <iframe
                src={agentGatewayIframeUrl}
                title="Agent Gateway"
                className="block w-full h-full min-h-[75vh] border-0"
                allow="clipboard-read; clipboard-write"
                onLoad={() => setIsLoading(false)}
                onError={() => {
                    setIsLoading(false);
                    setError(new Error('Failed to load Agent Gateway'));
                }}
            />
        </div>
    );
};

export default AgentGatewayEmbed;
