import { useState, type MouseEventHandler } from 'react';
import { FiCopy, FiCheck } from 'react-icons/fi';
import { twMerge } from 'tailwind-merge';

interface CopyTextProps {
    text: string;
    className?: string;
    textClassName?: string;
    children?: (props: { text: string; copied: boolean; handleCopy: MouseEventHandler<HTMLButtonElement> }) => React.ReactNode;
}

const CopyText = ({ text, className, children, textClassName }: CopyTextProps) => {
    const [copied, setCopied] = useState(false);

    const handleCopy: MouseEventHandler<HTMLButtonElement> = async (e) => {
        e.preventDefault();
        e.stopPropagation();
        await navigator.clipboard.writeText(text);
        setCopied(true);

        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <div className={twMerge('flex items-center gap-2 min-w-0 group', className)}>
            {/* Text */}
            {children ? (
                <div className="min-w-0" id="children">
                    {children({ text, copied, handleCopy })}
                </div>
            ) : (
                <span className={twMerge('min-w-0 truncate text-sm text-gray-700', textClassName)}>{text}</span>
            )}

            {/* Icon */}
            <div className="relative shrink-0">
                <button onClick={handleCopy} className="p-1 rounded transition-all duration-200 opacity-0 bg-white group-hover:opacity-100 hover:bg-gray-100 cursor-pointer">
                    {copied ? (
                        <FiCheck size={14} className="text-green-800 scale-110 transition-all duration-200" />
                    ) : (
                        <FiCopy size={14} className="text-gray-800 transition-all duration-200" />
                    )}
                </button>

                {copied && <div className="absolute -top-8 left-1/2 -translate-x-1/2 whitespace-nowrap rounded bg-black text-white text-xs px-2 py-1 shadow z-50">Copied!</div>}
            </div>
        </div>
    );
};

export default CopyText;
