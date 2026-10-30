import { type FC, useState, useRef, useCallback, useMemo } from 'react';
import { twMerge } from 'tailwind-merge';
import { X, Plus } from 'lucide-react';
import { INPUT_BASE, INPUT_ERROR } from './editor-styles';

interface TagEditorProps {
    value: unknown;
    onChange: (val: unknown) => void;
    onBlur: () => void;
    /** Separator used to split/join the tag string. Defaults to `','`. */
    separator?: string;
    placeholder?: string;
    hasError: boolean;
    className?: string;
}

/** Parse a raw value into an array of trimmed, non-empty tag strings. */
const parseTags = (raw: unknown, separator: string): string[] => {
    if (!raw) return [];
    return String(raw)
        .split(separator)
        .map((t) => t.trim())
        .filter(Boolean);
};

/** Tag-based editor - displays tags as removable chips with an inline input to add new ones. */
const TagEditor: FC<TagEditorProps> = ({ value, onChange, onBlur, separator = ',', placeholder = 'Add tag...', hasError, className }) => {
    const [inputValue, setInputValue] = useState('');
    const inputRef = useRef<HTMLInputElement>(null);

    const tags = useMemo(() => parseTags(value, separator), [value, separator]);

    const commitTag = useCallback(
        (raw: string) => {
            const tag = raw.trim();
            if (!tag) return;
            // Avoid duplicates (case-insensitive)
            if (tags.some((t) => t.toLowerCase() === tag.toLowerCase())) {
                setInputValue('');
                return;
            }
            const next = [...tags, tag].join(`${separator} `);
            onChange(next);
            setInputValue('');
        },
        [tags, separator, onChange],
    );

    const removeTag = useCallback(
        (index: number) => {
            const next = tags.filter((_, i) => i !== index).join(`${separator} `);
            onChange(next || '');
        },
        [tags, separator, onChange],
    );

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter' || e.key === separator || e.key === 'Tab') {
            e.preventDefault();
            commitTag(inputValue);
        } else if (e.key === 'Backspace' && !inputValue && tags.length > 0) {
            removeTag(tags.length - 1);
        }
    };

    const handleBlurInner = () => {
        // Commit any typed text as a tag on blur
        if (inputValue.trim()) {
            commitTag(inputValue);
        }
        onBlur();
    };

    return (
        <div className={twMerge(INPUT_BASE, 'flex min-h-7 flex-wrap items-center gap-1 py-0.5', hasError && INPUT_ERROR, className)} onClick={() => inputRef.current?.focus()}>
            {tags.map((tag, i) => (
                <span key={`${tag}-${i}`} className="inline-flex items-center gap-0.5 rounded bg-blue-50 px-1.5 py-0.5 text-[10px] font-medium text-blue-700">
                    {tag}
                    <button
                        type="button"
                        onClick={(e) => {
                            e.stopPropagation();
                            removeTag(i);
                        }}
                        className="cursor-pointer text-blue-400 hover:text-blue-600"
                    >
                        <X size={10} />
                    </button>
                </span>
            ))}
            <div className="flex min-w-15 flex-1 items-center gap-0.5">
                {tags.length === 0 && !inputValue && <Plus size={10} className="shrink-0 text-gray-300" />}
                <input
                    ref={inputRef}
                    type="text"
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    onKeyDown={handleKeyDown}
                    onBlur={handleBlurInner}
                    placeholder={tags.length === 0 ? placeholder : ''}
                    className="min-w-0 flex-1 border-none bg-transparent text-xs text-gray-700 outline-none placeholder:text-gray-400"
                />
            </div>
        </div>
    );
};

export default TagEditor;
