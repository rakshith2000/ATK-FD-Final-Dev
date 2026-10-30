import { useState } from 'react';
import { Copy, Check } from 'lucide-react';
import { appEnvConfig } from '@/config/app-env-config';
import anyToPlainValue from '@/shared/utils/anything-to-plain';
import { stringifyAnything } from '@/shared/utils/stringify-anything';

type PlainValue = string | number | boolean | null | undefined | PlainValue[] | { [key: string]: PlainValue };

function CauseValue({ value, depth = 0 }: { value: unknown; depth?: number }) {
    const plain = anyToPlainValue(value) as PlainValue;

    if (plain === null || plain === undefined) {
        return <span className="text-gray-500 italic">null</span>;
    }

    if (typeof plain === 'string') {
        return <span className="text-amber-600">"{plain}"</span>;
    }

    if (typeof plain === 'number' || typeof plain === 'boolean') {
        return <span className="text-blue-600">{String(plain)}</span>;
    }

    if (Array.isArray(plain)) {
        return (
            <span>
                <span className="text-gray-600">{'['}</span>
                <div className="pl-4">
                    {plain.map((item, i) => (
                        <div key={i}>
                            <CauseValue value={item} depth={depth + 1} />
                            {i < plain.length - 1 && <span className="text-gray-500">,</span>}
                        </div>
                    ))}
                </div>
                <span className="text-gray-600">{']'}</span>
            </span>
        );
    }

    if (typeof plain === 'object') {
        const entries = Object.entries(plain);
        return (
            <span>
                <span className="text-gray-600">{'{'}</span>
                <div className="pl-4 border-l border-red-900/40 ml-1">
                    {entries.map(([key, val], i) => (
                        <div key={key} className="flex gap-1.5 flex-wrap">
                            <span className="text-red-600 font-semibold">{key}:</span>
                            <CauseValue value={val} depth={depth + 1} />
                            {i < entries.length - 1 && <span className="text-gray-500">,</span>}
                        </div>
                    ))}
                </div>
                <span className="text-gray-600">{'}'}</span>
            </span>
        );
    }

    return <span className="text-gray-600">{String(plain)}</span>;
}

export function ErrorCauseRenderer({ error, copyOnly = false }: { error: Error | null | undefined; copyOnly?: boolean }) {
    const [copied, setCopied] = useState(false);

    if (!error || !appEnvConfig.isInDevelopmentMode) return null;

    const sections: { label: string; value: unknown }[] = [];

    if (error.message) sections.push({ label: 'Message', value: error.message });
    if (error.name && error.name !== 'Error') sections.push({ label: 'Name', value: error.name });
    if (error.cause !== undefined && error.cause !== null) sections.push({ label: 'Cause', value: error.cause });
    if (error.stack) sections.push({ label: 'Stack', value: error.stack });

    if (sections.length === 0) return null;

    const copyAllDetails = () => {
        const text = sections.map(({ label, value }) => `--- ${label} ---\n${label === 'Stack' ? String(value) : stringifyAnything(value)}`).join('\n\n');
        navigator.clipboard.writeText(text).then(() => {
            setCopied(true);
            setTimeout(() => setCopied(false), 1500);
        });
    };

    if (copyOnly) {
        return (
            <button
                type="button"
                onClick={copyAllDetails}
                className="flex items-center gap-1 text-gray-400 hover:text-gray-600 transition-colors cursor-pointer text-[10px]"
                title="Copy error details"
            >
                {copied ? <Check size={12} className="text-green-500" /> : <Copy size={12} />}
                <span>{copied ? 'Copied!' : 'Copy details'}</span>
            </button>
        );
    }

    return (
        <div className="w-full h-full flex flex-col rounded shadow bg-gray-50 text-xs font-mono leading-relaxed min-h-0 max-h-45">
            <div className="flex items-center gap-2 px-2.5 py-1.5 border-b border-red-900/40 bg-gray-50 shrink-0">
                {sections.map(({ label }) => (
                    <span key={label} className="text-red-600 font-semibold tracking-wide uppercase text-[10px]">
                        {label}
                    </span>
                ))}
                <button
                    type="button"
                    onClick={copyAllDetails}
                    className="ml-auto flex items-center gap-1 text-gray-400 hover:text-gray-600 transition-colors cursor-pointer"
                    title="Copy error details"
                >
                    {copied ? <Check size={12} className="text-green-500" /> : <Copy size={12} />}
                </button>
            </div>
            <div className="overflow-auto min-h-0 flex-1">
                <div className="p-2.5 space-y-2">
                    {sections.map(({ label, value }) => (
                        <div key={label}>
                            <span className="text-gray-400 font-semibold uppercase text-[10px] tracking-wide">{label}</span>
                            <div className="mt-0.5">
                                {label === 'Stack' ? (
                                    <pre className="text-gray-500 whitespace-pre-wrap wrap-break-word text-[11px] leading-snug">{String(value)}</pre>
                                ) : (
                                    <CauseValue value={value} />
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
