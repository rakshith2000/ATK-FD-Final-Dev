import type { FC } from 'react';
import { twMerge } from 'tailwind-merge';
import { INPUT_BASE, INPUT_ERROR } from './editor-styles';

interface BooleanEditorProps {
    value: unknown;
    onChange: (val: unknown) => void;
    onBlur: () => void;
    hasError: boolean;
    className?: string;
}

/** Boolean (Yes/No) select editor */
const BooleanEditor: FC<BooleanEditorProps> = ({ value, onChange, onBlur, hasError, className }) => (
    <select
        value={value === undefined || value === null ? '' : String(value)}
        onChange={(e) => {
            const v = e.target.value;
            onChange(v === '' ? null : v === 'true');
        }}
        onBlur={onBlur}
        className={twMerge(INPUT_BASE, hasError && INPUT_ERROR, className)}
    >
        <option value="">-</option>
        <option value="true">Yes</option>
        <option value="false">No</option>
    </select>
);

export default BooleanEditor;
