import { useCallback, useMemo } from 'react';
import { ExternalLink } from 'lucide-react';
import { IoCheckmarkDone } from 'react-icons/io5';
import { MdContentCopy } from 'react-icons/md';
import { appConfig } from '@/config/app-config';
import logger from '@/shared/utils/logger';
import { useCopyText } from '@/shared/hooks/useCopyText';

interface SSOClientInfo {
    label: string;
    value: string;
    isCopyable?: boolean;
    isLink?: boolean;
    linkTarget?: string;
}

const SSOClientInfoCard = () => {
    logger.debug('SSOClientInfoCard - Rendered');
    const ssoUrl = appConfig.auth.keycloak?.url ?? '';
    const { copy, copied } = useCopyText(5000);

    const ssoClientInfo: SSOClientInfo[] = useMemo(
        () => [
            {
                label: 'SSO URL',
                value: ssoUrl,
                isCopyable: true,
                isLink: true,
                linkTarget: '_blank',
            },
        ],
        [ssoUrl],
    );

    const handleOpenSSOClient = useCallback(() => {
        logger.debug('Opening SSO Client with URL:', { ssoUrl });
        window.open(ssoUrl, '_blank', 'noopener,noreferrer');
    }, [ssoUrl]);

    const handleCopyToClipboard = useCallback(
        (text: string) => {
            logger.debug('Copying to clipboard:', { text });
            copy(text);
        },
        [copy],
    );

    return (
        <div className="flex flex-col gap-4">
            {/* Info Section */}
            <div className="flex flex-col gap-3 bg-(--brand-color)/2 p-4 rounded-lg overflow-y-auto">
                {ssoClientInfo.map((info) => (
                    <div key={info.label} className="flex flex-col gap-1 border-b border-(--brand-border-color) last:border-b-0 pb-3 last:pb-0">
                        <label className="text-xs font-semibold text-(--brand-text-color)" htmlFor={`sso-${info.label}`}>
                            {info.label}
                        </label>
                        <div className="flex items-center gap-2">
                            {info.isLink ? (
                                <button
                                    id={`sso-${info.label}`}
                                    onClick={handleOpenSSOClient}
                                    className="flex items-center gap-1.5 text-xs text-(--brand-color) hover:text-(--brand-color)/80 font-medium transition-colors cursor-pointer"
                                    aria-label={`Open ${info.label}`}
                                >
                                    {info.value}
                                    <ExternalLink size={12} />
                                </button>
                            ) : (
                                <span id={`sso-${info.label}`} className="text-xs text-(--brand-text-color) break-all">
                                    {info.value}
                                </span>
                            )}
                            {info.isCopyable && (
                                <button
                                    onClick={() => handleCopyToClipboard(info.value)}
                                    title="Copy to clipboard"
                                    className="p-1 text-(--brand-text-gray) hover:text-(--brand-color) transition-colors cursor-pointer"
                                    aria-label={`Copy ${info.label} to clipboard`}
                                    disabled={copied}
                                >
                                    {copied ? <IoCheckmarkDone size={12} /> : <MdContentCopy size={12} />}
                                </button>
                            )}
                        </div>
                    </div>
                ))}
            </div>

            {/* Action Section */}
            <div className="flex flex-col gap-2 rounded-lg px-4 py-2 pt-0">
                <button
                    onClick={handleOpenSSOClient}
                    className="flex items-center justify-center gap-2 px-3 py-2 btn-split split-blue rounded-md transition-all text-xs font-medium cursor-pointer"
                    aria-label="Open SSO Client in a new window"
                >
                    <span className="flex flex-row flex-nowrap gap-2">
                        <ExternalLink size={14} />
                        Open SSO Client
                    </span>
                </button>
            </div>
        </div>
    );
};

export default SSOClientInfoCard;
