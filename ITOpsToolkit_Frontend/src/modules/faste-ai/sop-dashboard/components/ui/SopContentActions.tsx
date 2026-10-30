import { useState } from 'react';
import { FaCopy, FaDownload, FaCheck } from 'react-icons/fa';
import { twMerge } from 'tailwind-merge';
import { copyTextToClipboard, downloadSOPAsDocx } from '../../utils/sopFormatting';

interface SOPContentActionsProps {
    content?: string;
    fileName?: string;
    className?: string;
    onResult?: (message: string) => void;
}

export default function SOPContentActions({ content, fileName, className, onResult }: SOPContentActionsProps) {
    const [isCopied, setIsCopied] = useState(false);

    if (!content) return null;

    const handleCopyContent = async () => {
        const success = await copyTextToClipboard(content);
        if (success) {
            setIsCopied(true);
            if (onResult) onResult('Content copied to clipboard!');
            setTimeout(() => setIsCopied(false), 2000);
        } else {
            if (onResult) onResult('Failed to copy content.');
        }
    };

    const handleDownloadContent = () => {
        const success = downloadSOPAsDocx(content, fileName);
        if (success) {
            if (onResult) onResult('Document download started.');
        } else {
            if (onResult) onResult('Failed to download document.');
        }
    };

    return (
        <div className={twMerge('flex items-center gap-2', className)}>
            <button
                type="button"
                onClick={handleCopyContent}
                title={isCopied ? 'Copied!' : 'Copy SOP Content'}
                className={twMerge(
                    'p-2 rounded-lg text-xs font-medium border transition-all flex items-center gap-1.5 shadow-sm cursor-pointer',
                    isCopied ? 'bg-green-50 text-green-600 border-green-200' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50 hover:text-slate-800',
                )}
            >
                {isCopied ? <FaCheck className="text-green-600" size={13} /> : <FaCopy size={13} />}
            </button>

            <button
                type="button"
                onClick={handleDownloadContent}
                title="Download SOP as DOCX"
                className="p-2 rounded-lg text-xs font-medium border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 hover:text-slate-800 transition-all flex items-center gap-1.5 shadow-sm cursor-pointer"
            >
                <FaDownload size={13} />
            </button>
        </div>
    );
}
