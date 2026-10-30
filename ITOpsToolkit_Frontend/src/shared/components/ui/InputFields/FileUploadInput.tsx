import React, { forwardRef, useRef, useEffect, type ComponentPropsWithoutRef } from 'react';
import { twMerge } from 'tailwind-merge';
import { MdClose, MdCloudUpload } from 'react-icons/md';

interface FileUploadInputProps extends Omit<ComponentPropsWithoutRef<'div'>, 'onChange'> {
    value?: File;
    onChange?: (file: File) => void;
    onRemove?: (file: File) => void;
    onBlur?: () => void;
    error?: boolean;
    errorMessage?: string;
    disabled?: boolean;
    inputRef: React.RefObject<HTMLInputElement | null>;
    title?: string;
    infoText?: string;
    accept?: string;
    iconOnly?: boolean;
    iconSize?: number;
    currentUploadProgress?: number;
    primaryColor?: string;
    secondaryColor?: string;
    errorColor?: string;
    dropZoneClassName?: string;
    iconClassName?: string;
    titleClassName?: string;
    infoClassName?: string;
    fileClassName?: string;
    showRemove?: boolean;
    removeButtonClassName?: string;
}

const FileUploadInput = forwardRef<HTMLDivElement, FileUploadInputProps>(
    (
        {
            value: file,
            onChange,
            onRemove,
            onBlur,
            error,
            errorMessage,
            disabled,
            inputRef,
            title = 'Attach Proof',
            infoText = '<b>File size:</b> Maximum 1 MB | <b>File Formats:</b> jpeg, png, pdf',
            accept = '.jpeg, .jpg, .png, .pdf',
            iconOnly = false,
            iconSize = 40,
            currentUploadProgress,
            primaryColor = 'var(--brand-color)',
            secondaryColor = 'var(--brand-text-gray)',
            errorColor = 'var(--brand-error-color, #ef4444)',
            className,
            dropZoneClassName,
            iconClassName,
            titleClassName,
            infoClassName,
            fileClassName,
            removeButtonClassName,
            showRemove = true,
            ...rest
        },
        ref,
    ) => {
        const disabledRef = useRef(disabled);
        useEffect(() => {
            disabledRef.current = disabled;
        }, [disabled]);

        const handleChange = (f: File) => {
            if (disabledRef.current) return;
            onChange?.(f);
        };

        const handleRemove = (e: React.MouseEvent, f: File) => {
            e.stopPropagation();
            if (disabledRef.current) return;

            if (inputRef.current) inputRef.current.value = '';
            onRemove?.(f);
        };

        const showProgress = typeof currentUploadProgress === 'number' && currentUploadProgress > 0 && currentUploadProgress < 100;
        const isCompleted = currentUploadProgress === 100;
        const canRemove = showRemove && !showProgress && !isCompleted;

        const borderColor = error ? errorColor : secondaryColor;
        const iconColor = error ? errorColor : primaryColor;
        const textColor = error ? errorColor : secondaryColor;

        return (
            <div ref={ref} className={twMerge('flex w-full flex-col items-center overflow-x-auto', className)} {...rest}>
                <div
                    className={twMerge(
                        'relative w-[95%] cursor-pointer rounded-2xl border border-dashed p-2 text-center transition-colors',
                        disabled && 'opacity-60 cursor-not-allowed pointer-events-none',
                        dropZoneClassName,
                    )}
                    style={{ borderColor }}
                    onClick={() => !disabledRef.current && inputRef?.current?.click()}
                    onBlur={onBlur}
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={(e) => {
                        e.preventDefault();
                        if (disabledRef.current) return;
                        const files = e.dataTransfer.files;
                        if (files && files.length > 0) handleChange(files[0]);
                    }}
                    onMouseEnter={(e) => {
                        if (!disabledRef.current) (e.currentTarget as HTMLDivElement).style.borderColor = primaryColor;
                    }}
                    onMouseLeave={(e) => {
                        (e.currentTarget as HTMLDivElement).style.borderColor = borderColor;
                    }}
                    role="button"
                    tabIndex={disabled ? -1 : 0}
                    aria-label={title}
                    data-upload-zone
                >
                    <input
                        type="file"
                        ref={inputRef}
                        className="hidden"
                        accept={accept}
                        disabled={disabled}
                        onChange={(e) => {
                            const files = e.target.files;
                            if (files && files.length > 0) handleChange(files[0]);
                        }}
                    />

                    {showProgress && (
                        <div className="absolute inset-0 z-20 flex items-center justify-center overflow-hidden rounded-2xl backdrop-blur-sm bg-white/60">
                            <div
                                className="absolute left-0 top-0 h-full rounded-2xl transition-[width] duration-200"
                                style={{
                                    width: `${currentUploadProgress}%`,
                                    background: `color-mix(in srgb, ${primaryColor} 30%, transparent)`,
                                }}
                            />
                            <span className="relative z-10 text-sm font-bold" style={{ color: primaryColor }}>
                                {currentUploadProgress}%
                            </span>
                        </div>
                    )}

                    {isCompleted && (
                        <div className="absolute inset-0 z-30 flex items-center justify-center rounded-2xl backdrop-blur-sm bg-white/70">
                            <span className="text-sm font-bold" style={{ color: primaryColor }}>
                                Upload Completed!
                            </span>
                        </div>
                    )}

                    {iconOnly ? (
                        <div className="flex flex-row items-center justify-between gap-2.5">
                            <MdCloudUpload size={iconSize} style={{ color: iconColor }} className={iconClassName} />
                            <span className={twMerge('block max-w-full overflow-hidden text-ellipsis text-sm', titleClassName)} style={{ color: textColor }}>
                                {file?.name ?? title}
                            </span>
                            {file && canRemove && (
                                <button
                                    type="button"
                                    onClick={(e) => {
                                        handleRemove(e, file);
                                    }}
                                    aria-label={`Remove ${file.name}`}
                                    title="Remove file"
                                    className={twMerge('shrink-0 rounded-full p-0.5 hover:bg-black/5 cursor-pointer', removeButtonClassName)}
                                    style={{ color: textColor }}
                                >
                                    <MdClose size={16} />
                                </button>
                            )}
                        </div>
                    ) : (
                        <div className="flex flex-col items-center gap-0.5">
                            <MdCloudUpload size={iconSize} style={{ color: iconColor }} className={iconClassName} />
                            <span className={twMerge('text-xs', titleClassName)} style={{ color: textColor }}>
                                {title}
                            </span>
                            <span className={twMerge('text-xs', infoClassName)} style={{ color: textColor }}>
                                {renderInfoText(infoText)}
                            </span>

                            {file && (
                                <span
                                    className={twMerge(
                                        'mt-2 flex items-center gap-2 text-xs text-(--brand-text-color) border border-(--brand-border-color) rounded-md p-2',
                                        fileClassName,
                                    )}
                                >
                                    <span className="max-w-55 overflow-hidden text-ellipsis whitespace-nowrap">Selected file: {file.name}</span>
                                    {canRemove && (
                                        <button
                                            type="button"
                                            onClick={(e) => {
                                                handleRemove(e, file);
                                            }}
                                            aria-label={`Remove ${file.name}`}
                                            title="Remove file"
                                            className={twMerge('shrink-0 rounded-full p-0.5 hover:bg-black/5 cursor-pointer', removeButtonClassName)}
                                        >
                                            <MdClose size={14} />
                                        </button>
                                    )}
                                </span>
                            )}

                            {error && errorMessage && (
                                <span className="mt-1 px-2 text-xs font-medium" style={{ color: errorColor }}>
                                    {errorMessage.replace(/Input not instance of File/g, 'Invalid File / Please upload a file with valid format')}
                                </span>
                            )}
                        </div>
                    )}
                </div>
            </div>
        );
    },
);

FileUploadInput.displayName = 'FileUploadInput';

export default FileUploadInput;

function renderInfoText(infoText: string) {
    const parts = infoText.split(/(<b>.*?<\/b>)/g);
    return parts.map((part, i) => (part.startsWith('<b>') && part.endsWith('</b>') ? <b key={i}>{part.replace(/<\/?b>/g, '')}</b> : <span key={i}>{part}</span>));
}
