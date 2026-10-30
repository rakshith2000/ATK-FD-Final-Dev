/**
 * Shared input components for the Form Builder UI (FormConfigEditor, FieldConfigPanel).
 * Single source of truth - do NOT duplicate these in individual panels.
 */
import React, { useState, useEffect, useMemo } from 'react';
import { TextInput } from '@/shared/components/ui/InputFields';
import CopyText from '@/shared/components/ui/CopyText/CopyText';
import { validateTemplates, validateTemplateString, validateKeyTemplate } from '../../utils/validate-templates';
import { twMerge, type ClassNameValue } from 'tailwind-merge';

//  Layout helpers

/** Simple label wrapper for standalone inputs */
export const Label: React.FC<{ text: string; required?: boolean; children: React.ReactNode; className?: ClassNameValue }> = ({ text, required, children, className }) => (
    <div className={twMerge('space-y-0.5', className)}>
        <label className="text-[10px] font-medium text-gray-500">
            {text}
            {required && <span className="text-red-400 ml-0.5">*</span>}
        </label>
        {children}
    </div>
);

export const SectionTitle: React.FC<{ children: React.ReactNode }> = ({ children }) => (
    <div className="flex items-center text-[10px] font-bold uppercase tracking-wider text-gray-400 pt-2">{children}</div>
);

// Template inputs

/** Text input with live `{prefix:key}` template syntax validation on every change.
 *  All template tokens require a source prefix (meta, field, response, initialValue). */
export const TemplateInput: React.FC<{
    value: string;
    onChange: (v: string) => void;
    placeholder?: string;
}> = ({ value, onChange, placeholder }) => {
    const error = value ? validateTemplateString(value) : undefined;
    return (
        <div>
            <TextInput value={value} onChange={onChange} placeholder={placeholder} />
            {error && <p className="text-[9px] text-red-500 mt-0.5">Template error: {error}</p>}
        </div>
    );
};

/** Text input for key/mapping fields - requires `{prefix:key}` syntax.
 *  Warns on bare strings like `name` (should be `{response:name}`). */
export const TemplateKeyInput: React.FC<{
    value: string;
    onChange: (v: string) => void;
    placeholder?: string;
}> = ({ value, onChange, placeholder }) => {
    const error = value ? validateKeyTemplate(value) : undefined;
    return (
        <div>
            <TextInput value={value} onChange={onChange} placeholder={placeholder} />
            {error && <p className="text-[9px] text-red-500 mt-0.5">{error}</p>}
        </div>
    );
};

/** Comma-separated text input with per-segment `{prefix:key}` template validation on every change. */
export const TemplateCSVInput: React.FC<{
    value: string;
    onChange: (v: string) => void;
    placeholder?: string;
}> = ({ value, onChange, placeholder }) => {
    const [localValue, setLocalValue] = useState(value);

    useEffect(() => {
        setLocalValue((prev) => {
            const normPrev = prev
                .split(',')
                .map((s) => s.trim())
                .filter(Boolean)
                .join(',');
            const normVal = value
                .split(',')
                .map((s) => s.trim())
                .filter(Boolean)
                .join(',');
            if (normPrev === normVal) return prev;
            return value;
        });
    }, [value]);

    const handleChange = (v: string) => {
        setLocalValue(v);
        onChange(v);
    };

    const error = useMemo(() => {
        if (!localValue.trim()) return undefined;
        const segments = localValue
            .split(',')
            .map((s) => s.trim())
            .filter(Boolean);
        for (const seg of segments) {
            const err = validateTemplateString(seg);
            if (err) return `"${seg}": ${err}`;
        }
        return undefined;
    }, [localValue]);

    return (
        <div>
            <TextInput value={localValue} onChange={handleChange} placeholder={placeholder} />
            {error && <p className="text-[9px] text-red-500 mt-0.5">Template error: {error}</p>}
        </div>
    );
};

// JSON input

/** JSON input with live validation on every change. Local string state syncs valid parsed values to parent.
 *  Reports error state via `onError` so the parent can disable save when any JsonInput has errors. */
export const JsonInput: React.FC<{
    value: Record<string, unknown> | undefined;
    onChange: (v: Record<string, unknown> | undefined) => void;
    onError?: (hasError: boolean) => void;
    placeholder?: string;
}> = ({ value, onChange, onError, placeholder }) => {
    const formatJson = (val: Record<string, unknown> | undefined) => (val ? JSON.stringify(val, null, 2) : '');
    const [localValue, setLocalValue] = useState(() => formatJson(value));
    const [errorMsg, setErrorMsg] = useState<string | undefined>(undefined);

    // Sync when parent value changes externally (e.g., reset or programmatic update)
    useEffect(() => {
        const serialized = formatJson(value);
        setLocalValue((prev) => {
            try {
                const prevParsed = prev.trim() ? JSON.parse(prev) : undefined;
                if (JSON.stringify(prevParsed) === JSON.stringify(value)) return prev;
            } catch {
                /* prev is invalid, update */
            }
            return serialized;
        });
    }, [value]);

    const handleChange = (v: string) => {
        setLocalValue(v);
        const trimmed = v.trim();
        if (!trimmed) {
            onChange(undefined);
            setErrorMsg(undefined);
            onError?.(false);
            return;
        }
        try {
            const parsed = JSON.parse(trimmed) as Record<string, string>;
            const templateError = validateTemplates(parsed);
            if (templateError) {
                setErrorMsg(`Template error: ${templateError}`);
                onError?.(true);
                return;
            }
            onChange(parsed);
            setErrorMsg(undefined);
            onError?.(false);
        } catch {
            setErrorMsg('Invalid JSON');
            onError?.(true);
        }
    };

    return (
        <div className="relative group">
            <TextInput value={localValue} onChange={handleChange} placeholder={placeholder} multiline spellCheck={false} autoComplete="off" autoCorrect="off" />
            {localValue && (
                <CopyText text={localValue} className="absolute top-1 right-1 min-w-0!">
                    {() => <></>}
                </CopyText>
            )}
            {errorMsg && <p className="text-[9px] text-red-500 mt-0.5">{errorMsg}</p>}
        </div>
    );
};
