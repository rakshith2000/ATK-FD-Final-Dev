import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import { mergeRegister } from '@lexical/utils';
import {
    $createNodeSelection,
    $createTextNode,
    $getNearestNodeFromDOMNode,
    $getNodeByKey,
    $getSelection,
    $isNodeSelection,
    $isRangeSelection,
    $isTextNode,
    $setSelection,
    CLICK_COMMAND,
    COMMAND_PRIORITY_LOW,
    SELECTION_CHANGE_COMMAND,
} from 'lexical';
import { useCallback, useEffect, useMemo, useRef, useState, type ChangeEvent } from 'react';
import { twMerge, type ClassNameValue } from 'tailwind-merge';
import { TextInput, NumberInput, SelectInput, FileUploadInput } from '@/shared/components/ui/InputFields';
import {
    Bold,
    Italic,
    Underline,
    Strikethrough,
    Subscript,
    Superscript,
    Link2,
    Image,
    AlignLeft,
    AlignCenter,
    AlignRight,
    AlignJustify,
    PaintBucket,
    Eraser,
    X,
    CaseUpperIcon,
    CaseLowerIcon,
    Plus,
    Minus,
    ALargeSmall,
    List,
    ListOrdered,
    Pencil,
    Table,
    Box,
    Trash2,
    Baseline,
    Lock,
    Unlock,
    ChevronDown,
} from 'lucide-react';
import {
    applyTextColor,
    adjustFontSize,
    clearFormatting,
    editImage,
    insertLink,
    insertTable,
    insertTableRow,
    deleteTableRow,
    insertTableColumn,
    deleteTableColumn,
    deleteTable,
    $isInsideTable,
    insertParagraphAfterTable,
    insertContainer,
    updateContainer,
    removeContainer,
    $getContainerNode,
    setBlockType,
    setFontFamily,
    setTextAlignment,
    toggleListType,
    toggleTextFormat,
    transformTextCase,
} from '../utils/formatting';
import { $isHeadingNode, $isQuoteNode } from '@lexical/rich-text';
import { $isImageNode, type ImageAlignment } from '../nodes/ImageNode';
import { $isLinkNode } from '@lexical/link';
import { $isListNode } from '@lexical/list';
import { CodeBlockNode } from '../nodes/CodeBlockNode';
import logger from '@/shared/utils/logger';
import { uploadSnowAttachment } from '@/shared/modules/servicenow/services/upload-snow-attachment';
import { useRichTextEditorContext } from '../RichTextEditorContext';

type ToolbarModalType = 'link' | 'image' | 'table' | 'container' | null;

type ToolbarModalState = {
    url: string;
    altText: string;
    displayText: string;
    width: string;
    height: string;
    alignment: ImageAlignment;
    rows: string;
    columns: string;
    /** Key of existing LinkNode being edited (null = inserting new) */
    linkNodeKey: string | null;
    containerTag: string;
    containerClass: string;
    containerStyle: string;
};

const DEFAULT_MODAL_STATE: ToolbarModalState = {
    url: '',
    altText: '',
    displayText: '',
    width: '',
    height: '',
    alignment: 'center',
    rows: '2',
    columns: '2',
    linkNodeKey: null,
    containerTag: 'div',
    containerClass: '',
    containerStyle: '',
};

// --- Tailwind style constants ---

const ICON_BUTTON =
    'border-0 inline-flex items-center justify-center bg-transparent rounded-md p-0 w-7 h-7 cursor-pointer transition-colors text-slate-600 hover:bg-slate-100 hover:text-slate-900 disabled:cursor-not-allowed disabled:opacity-40';
const ICON_BUTTON_ACTIVE = 'bg-indigo-50 text-indigo-600 hover:bg-indigo-100';
const COLOR_PICKER_LABEL = 'inline-flex items-center gap-1 text-slate-600 cursor-pointer hover:text-slate-900 transition-colors';
const COLOR_PICKER_INPUT = 'w-5 h-5 p-0 border-none rounded cursor-pointer bg-transparent';
const GROUP_DIVIDER = 'w-px h-5 bg-slate-200 mx-0.5';
const MODAL_LABEL = 'flex flex-col gap-1.5 text-[13px] text-slate-700';
const MODAL_INPUT = 'py-2.5 px-3 border border-slate-300 rounded-[10px] bg-slate-50 outline-none';
const MODAL_BUTTON_BASE = 'inline-flex items-center justify-center min-w-9 min-h-9 rounded-[10px] cursor-pointer transition-colors px-2.5 py-2 flex-1';

function ToolbarModal({
    open,
    title,
    error,
    confirmDisabled,
    confirmText = 'Confirm',
    children,
    onClose,
    onSubmit,
}: {
    open: boolean;
    title: string;
    error?: string;
    confirmDisabled?: boolean;
    confirmText?: string;
    onClose: () => void;
    onSubmit: () => void | Promise<void>;
    children: React.ReactNode;
}) {
    if (!open) {
        return null;
    }

    return (
        <div className="fixed inset-0 z-999 bg-slate-100/20 backdrop-blur-[1px] flex items-center justify-center p-4" role="dialog" aria-modal="true">
            <div
                className="w-[min(420px,100%)] bg-white rounded-xl shadow-2xl ring-2 ring-slate-500/10 overflow-hidden flex flex-col min-h-40 max-h-[70dvh]"
                onClick={(event) => event.stopPropagation()}
            >
                {/* Fixed Header */}
                <div className="flex-none flex items-center justify-between p-4 border-b border-slate-100">
                    <span className="text-sm font-semibold">{title}</span>
                    <button
                        type="button"
                        className="border-none bg-transparent cursor-pointer text-slate-700 disabled:opacity-40 disabled:cursor-not-allowed"
                        onClick={onClose}
                        disabled={confirmDisabled}
                        aria-label="Close modal"
                        title="Close modal"
                    >
                        <X size={18} />
                    </button>
                </div>

                {/* Scrollable Body */}
                <div className="flex-1 overflow-y-auto px-4 py-4">{children}</div>

                {/* Error */}
                {error && <div className="flex-none px-4 pb-3 text-red-700 text-[13px]">{error}</div>}

                {/* Fixed Footer */}
                <div className="flex-none flex items-center justify-between p-4 gap-2.5 border-t border-slate-100">
                    <button
                        type="button"
                        className={twMerge(MODAL_BUTTON_BASE, 'bg-slate-50 text-gray-800 border border-slate-300 disabled:opacity-40 disabled:cursor-not-allowed')}
                        onClick={onClose}
                        disabled={confirmDisabled}
                    >
                        Cancel
                    </button>
                    <button
                        type="button"
                        className={twMerge(MODAL_BUTTON_BASE, 'bg-blue-600 text-white border border-transparent disabled:opacity-60 disabled:cursor-not-allowed')}
                        onClick={onSubmit}
                        disabled={confirmDisabled}
                    >
                        {confirmText}
                    </button>
                </div>
            </div>
        </div>
    );
}

// --- Table Actions Dropdown ---

const TABLE_DROPDOWN_ITEM =
    'flex items-center gap-2.5 w-full px-3 py-1.5 text-[12.5px] text-left bg-transparent border-0 cursor-pointer rounded transition-colors hover:bg-slate-100 text-slate-700 hover:text-slate-900';
const TABLE_DROPDOWN_ITEM_DANGER =
    'flex items-center gap-2.5 w-full px-3 py-1.5 text-[12.5px] text-left bg-transparent border-0 cursor-pointer rounded transition-colors hover:bg-red-50 text-red-600 hover:text-red-700';
const TABLE_DROPDOWN_SEPARATOR = 'h-px bg-slate-200 my-1 mx-2';

function TableActionsDropdown({
    onInsertRowAbove,
    onInsertRowBelow,
    onDeleteRow,
    onInsertColumnBefore,
    onInsertColumnAfter,
    onDeleteColumn,
    onDeleteTable,
    onInsertParagraphAfter,
}: {
    onInsertRowAbove: () => void;
    onInsertRowBelow: () => void;
    onDeleteRow: () => void;
    onInsertColumnBefore: () => void;
    onInsertColumnAfter: () => void;
    onDeleteColumn: () => void;
    onDeleteTable: () => void;
    onInsertParagraphAfter: () => void;
}) {
    const [open, setOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!open) return;
        const handleClickOutside = (e: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
                setOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [open]);

    const run = (action: () => void) => {
        action();
        setOpen(false);
    };

    return (
        <div className="relative" ref={dropdownRef}>
            <button
                type="button"
                className={twMerge(ICON_BUTTON, 'w-auto px-1.5 gap-0.5 text-[11.5px] font-medium', open && ICON_BUTTON_ACTIVE)}
                aria-label="Table actions"
                title="Table actions"
                onClick={() => setOpen((prev) => !prev)}
            >
                <span>Edit Table</span>
                <ChevronDown size={12} />
            </button>
            {open && (
                <div className="absolute top-full left-0 mt-1 z-50 min-w-48 bg-white rounded-lg shadow-xl ring-1 ring-slate-200 py-1.5 animate-in fade-in-0 zoom-in-95 duration-100">
                    <div className="px-3 py-1 text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Rows</div>
                    <button type="button" className={TABLE_DROPDOWN_ITEM} onClick={() => run(onInsertRowAbove)}>
                        Insert row above
                    </button>
                    <button type="button" className={TABLE_DROPDOWN_ITEM} onClick={() => run(onInsertRowBelow)}>
                        Insert row below
                    </button>
                    <button type="button" className={TABLE_DROPDOWN_ITEM_DANGER} onClick={() => run(onDeleteRow)}>
                        Delete row
                    </button>
                    <div className={TABLE_DROPDOWN_SEPARATOR} />
                    <div className="px-3 py-1 text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Columns</div>
                    <button type="button" className={TABLE_DROPDOWN_ITEM} onClick={() => run(onInsertColumnBefore)}>
                        Insert column before
                    </button>
                    <button type="button" className={TABLE_DROPDOWN_ITEM} onClick={() => run(onInsertColumnAfter)}>
                        Insert column after
                    </button>
                    <button type="button" className={TABLE_DROPDOWN_ITEM_DANGER} onClick={() => run(onDeleteColumn)}>
                        Delete column
                    </button>
                    <div className={TABLE_DROPDOWN_SEPARATOR} />
                    <button type="button" className={TABLE_DROPDOWN_ITEM} onClick={() => run(onInsertParagraphAfter)}>
                        Write after table
                    </button>
                    <button type="button" className={TABLE_DROPDOWN_ITEM_DANGER} onClick={() => run(onDeleteTable)}>
                        <Trash2 size={13} />
                        Delete entire table
                    </button>
                </div>
            )}
        </div>
    );
}

const MAX_NON_SNOW_IMAGE_SIZE_BYTES = 100 * 1024; // 100 KB limit
const MAX_SNOW_IMAGE_SIZE_BYTES = 50 * 1024 * 1024; // 50 MB limit

const validateUrl = (value: string) => {
    if (!value.trim()) {
        return false;
    }
    try {
        new URL(value.trim());
        return true;
    } catch {
        return false;
    }
};

const validateImageUrl = (value: string) => {
    const trimmed = value.trim();
    if (!trimmed) {
        return false;
    }
    if (trimmed.startsWith('data:image/') || trimmed.startsWith('blob:') || trimmed.startsWith('sys_attachment.do') || trimmed.startsWith('/sys_attachment.do')) {
        return true;
    }
    try {
        new URL(trimmed);
        return true;
    } catch {
        return false;
    }
};

export default function ToolbarPlugin({ className }: { className?: ClassNameValue }) {
    const [editor] = useLexicalComposerContext();
    const {
        extensions,
        isSnowRelated,
        snowTableName,
        snowSysId,
        onRequireSnowRecord,
        urlMapRef,
        defaultFontSize,
        defaultFontSizePx,
        defaultFontFamily,
        fontFamilies,
        setDefaultFontSize,
        setDefaultFontFamily,
    } = useRichTextEditorContext();
    const [isBold, setIsBold] = useState(false);
    const [isItalic, setIsItalic] = useState(false);
    const [isUnderline, setIsUnderline] = useState(false);
    const [isStrikethrough, setIsStrikethrough] = useState(false);
    const [isSubscript, setIsSubscript] = useState(false);
    const [isSuperscript, setIsSuperscript] = useState(false);
    const [blockType, setBlockTypeState] = useState<'normal' | 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'quote' | 'code'>('normal');
    const [alignment, setAlignment] = useState<'left' | 'center' | 'right' | 'justify'>('left');
    const [listType, setListType] = useState<'bullet' | 'number' | null>(null);
    const [isInsideLink, setIsInsideLink] = useState(false);
    const [isOnImage, setIsOnImage] = useState(false);
    const [modalType, setModalType] = useState<ToolbarModalType>(null);
    const [modalState, setModalState] = useState<ToolbarModalState>(DEFAULT_MODAL_STATE);
    const [fontSize, setFontSize] = useState<string>(defaultFontSizePx);
    const [fontFamily, setFontFamily_] = useState<string>(defaultFontFamily);
    const [textColor, setTextColor] = useState<string>('#000000');
    const [bgColor, setBgColor] = useState<string>('#ffffff');
    const [isInsideTable, setIsInsideTable] = useState(false);
    const [isInsideContainer, setIsInsideContainer] = useState(false);
    const [containerTag, setContainerTag] = useState('');
    const [modalError, setModalError] = useState('');
    const [selectedImageFile, setSelectedImageFile] = useState<File | null>(null);
    const [isUploadingSnowImage, setIsUploadingSnowImage] = useState(false);
    const [isRatioLocked, setIsRatioLocked] = useState(true);
    const aspectRatioRef = useRef<number | null>(null);
    const imageFileInputRef = useRef<HTMLInputElement | null>(null);
    const previewBlobUrlRef = useRef<string | null>(null);

    const isSnowUpload = isSnowRelated && Boolean(snowTableName && (snowSysId || onRequireSnowRecord));

    const handleWidthChange = useCallback(
        (val: number | undefined) => {
            const widthStr = val !== undefined && val > 0 ? String(val) : '';
            setModalState((prev) => {
                if (!isRatioLocked || !aspectRatioRef.current || !val) {
                    return { ...prev, width: widthStr };
                }
                const calculatedHeight = Math.round(val / aspectRatioRef.current);
                return {
                    ...prev,
                    width: widthStr,
                    height: calculatedHeight > 0 ? String(calculatedHeight) : '',
                };
            });
        },
        [isRatioLocked],
    );

    const handleHeightChange = useCallback(
        (val: number | undefined) => {
            const heightStr = val !== undefined && val > 0 ? String(val) : '';
            setModalState((prev) => {
                if (!isRatioLocked || !aspectRatioRef.current || !val) {
                    return { ...prev, height: heightStr };
                }
                const calculatedWidth = Math.round(val * aspectRatioRef.current);
                return {
                    ...prev,
                    height: heightStr,
                    width: calculatedWidth > 0 ? String(calculatedWidth) : '',
                };
            });
        },
        [isRatioLocked],
    );

    const toggleRatioLock = useCallback(() => {
        setIsRatioLocked((prev) => {
            const nextLocked = !prev;
            if (nextLocked && aspectRatioRef.current) {
                setModalState((current) => {
                    const w = Number(current.width);
                    const h = Number(current.height);
                    if (w > 0) {
                        const newHeight = Math.round(w / aspectRatioRef.current!);
                        return { ...current, height: newHeight > 0 ? String(newHeight) : current.height };
                    }
                    if (h > 0) {
                        const newWidth = Math.round(h * aspectRatioRef.current!);
                        return { ...current, width: newWidth > 0 ? String(newWidth) : current.width };
                    }
                    return current;
                });
            }
            return nextLocked;
        });
    }, []);

    const handleImageFileRemove = useCallback(() => {
        if (previewBlobUrlRef.current) {
            URL.revokeObjectURL(previewBlobUrlRef.current);
            previewBlobUrlRef.current = null;
        }
        aspectRatioRef.current = null;
        setSelectedImageFile(null);
        setModalState((prev) => ({ ...prev, url: '', width: '', height: '', altText: '' }));
        setModalError('');
        if (imageFileInputRef.current) {
            imageFileInputRef.current.value = '';
        }
    }, []);

    const handleImageFileChange = useCallback(
        (file: File) => {
            const cleanFileName = file.name.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' ');
            if (!isSnowUpload) {
                if (file.size > MAX_NON_SNOW_IMAGE_SIZE_BYTES) {
                    setModalError('Image size exceeds 100 KB limit. Please upload a smaller image.');
                    setSelectedImageFile(null);
                    return;
                }
                setModalError('');
                setSelectedImageFile(file);
                const reader = new FileReader();
                reader.onload = (e) => {
                    const base64Url = e.target?.result as string;
                    aspectRatioRef.current = null;
                    setModalState((prev) => ({
                        ...prev,
                        url: base64Url,
                        width: '',
                        height: '',
                        altText: prev.altText || cleanFileName,
                    }));
                };
                reader.onerror = () => {
                    setModalError('Failed to read image file.');
                };
                reader.readAsDataURL(file);
            } else {
                if (file.size > MAX_SNOW_IMAGE_SIZE_BYTES) {
                    setModalError('Image size exceeds 50 MB limit for ServiceNow upload. Please upload a smaller image.');
                    setSelectedImageFile(null);
                    return;
                }
                setModalError('');
                setSelectedImageFile(file);

                // Revoke any previous temporary preview blob URL created in this modal session
                if (previewBlobUrlRef.current) {
                    URL.revokeObjectURL(previewBlobUrlRef.current);
                    previewBlobUrlRef.current = null;
                }

                // Create local object URL for preview ONLY (upload happens on user confirm)
                const previewUrl = URL.createObjectURL(file);
                previewBlobUrlRef.current = previewUrl;
                aspectRatioRef.current = null;
                setModalState((prev) => ({
                    ...prev,
                    url: previewUrl,
                    width: '',
                    height: '',
                    altText: prev.altText || cleanFileName,
                }));
            }
        },
        [isSnowUpload],
    );

    const updateToolbar = useCallback(() => {
        const selection = $getSelection();
        if ($isNodeSelection(selection)) {
            const hasImage = selection.getNodes().some($isImageNode);
            setIsOnImage(hasImage);
            return;
        }
        if (!$isRangeSelection(selection)) {
            return;
        }

        const anchorNode = selection.anchor.getNode();

        // Read inline styles from the anchor text node (cursor position)
        const anchorTextNode = $isTextNode(anchorNode) ? anchorNode : null;
        const anchorStyle = anchorTextNode?.getStyle() ?? '';

        // Font size - show from anchor or "Mixed" if selection spans different sizes
        const selectedTextNodes = selection.getNodes().filter($isTextNode);
        const fontSizes = selectedTextNodes
            .map((node) => {
                const style = node.getStyle();
                const match = /font-size\s*:\s*([^;]+)/.exec(style);
                return match ? match[1].trim() : null;
            })
            .filter((size): size is string => Boolean(size));

        if (fontSizes.length === 0) {
            let actualSize: string | null = null;
            const domNode = editor.getElementByKey(anchorNode.getKey()) ?? (anchorNode.getParent() ? editor.getElementByKey(anchorNode.getParent()!.getKey()) : null);
            if (domNode) {
                const computed = window.getComputedStyle(domNode).fontSize;
                if (computed) {
                    const parsed = parseFloat(computed);
                    if (!isNaN(parsed) && parsed > 0) {
                        actualSize = `${Math.round(parsed)}px`;
                    }
                }
            }
            if (!actualSize) {
                const root = editor.getRootElement();
                if (root) {
                    const rootComputed = window.getComputedStyle(root).fontSize;
                    if (rootComputed) {
                        const parsed = parseFloat(rootComputed);
                        if (!isNaN(parsed) && parsed > 0) {
                            actualSize = `${Math.round(parsed)}px`;
                        }
                    }
                }
            }
            setFontSize(actualSize ?? defaultFontSizePx);
        } else if (fontSizes.every((value) => value === fontSizes[0])) {
            const rawSize = fontSizes[0];
            const parsed = parseFloat(rawSize);
            setFontSize(!isNaN(parsed) && parsed > 0 ? `${Math.round(parsed)}px` : rawSize);
        } else {
            setFontSize('Mixed');
        }

        // Font family from anchor
        const familyMatch = /font-family\s*:\s*([^;]+)/.exec(anchorStyle);
        if (familyMatch) {
            setFontFamily_(familyMatch[1].trim().replace(/['"]/g, ''));
        } else {
            let actualFamily: string | null = null;
            const domNode = editor.getElementByKey(anchorNode.getKey()) ?? (anchorNode.getParent() ? editor.getElementByKey(anchorNode.getParent()!.getKey()) : null);
            if (domNode) {
                const computed = window.getComputedStyle(domNode).fontFamily;
                if (computed) {
                    const firstFont = computed.split(',')[0].trim().replace(/['"]/g, '');
                    if (fontFamilies.includes(firstFont)) {
                        actualFamily = firstFont;
                    }
                }
            }
            setFontFamily_(actualFamily ?? defaultFontFamily);
        }

        // Text color from anchor
        const colorMatch = /(?:^|;)\s*color\s*:\s*([^;]+)/.exec(anchorStyle);
        setTextColor(colorMatch ? colorMatch[1].trim() : '#000000');

        // Background color from anchor
        const bgMatch = /background-color\s*:\s*([^;]+)/.exec(anchorStyle);
        setBgColor(bgMatch ? bgMatch[1].trim() : '#ffffff');

        setIsBold(selection.hasFormat('bold'));
        setIsItalic(selection.hasFormat('italic'));
        setIsUnderline(selection.hasFormat('underline'));
        setIsStrikethrough(selection.hasFormat('strikethrough'));
        setIsSubscript(selection.hasFormat('subscript'));
        setIsSuperscript(selection.hasFormat('superscript'));
        // Walk up from the anchor to find the nearest block element (heading, quote, code, paragraph).
        // We can't use getTopLevelElement() because ContainerNodes may wrap block elements,
        // and getTopLevelElement() would return the outermost container instead.
        let blockElement = anchorNode.getParent();
        while (blockElement) {
            if ($isHeadingNode(blockElement) || $isQuoteNode(blockElement) || blockElement.getType() === CodeBlockNode.getType() || blockElement.getType() === 'paragraph') {
                break;
            }
            const parent = blockElement.getParent();
            if (!parent) break;
            blockElement = parent;
        }

        if ($isHeadingNode(blockElement)) {
            const tag = blockElement.getTag();
            setBlockTypeState(tag === 'h1' || tag === 'h2' || tag === 'h3' || tag === 'h4' || tag === 'h5' ? tag : 'normal');
        } else if ($isQuoteNode(blockElement)) {
            setBlockTypeState('quote');
        } else if (blockElement?.getType() === CodeBlockNode.getType()) {
            setBlockTypeState('code');
        } else {
            setBlockTypeState('normal');
        }

        const formatType = blockElement?.getFormatType?.();
        setAlignment(formatType === 'center' || formatType === 'right' || formatType === 'justify' ? formatType : 'left');

        // Detect list type
        let detectedListType: 'bullet' | 'number' | null = null;
        let current = anchorNode.getParent();
        while (current) {
            if ($isListNode(current)) {
                const lt = current.getListType();
                detectedListType = lt === 'number' ? 'number' : 'bullet';
                break;
            }
            current = current.getParent();
        }
        setListType(detectedListType);

        // Detect link at cursor
        let linkDetected = false;
        let node = anchorNode;
        let parent = node.getParent();
        while (parent) {
            if ($isLinkNode(parent)) {
                linkDetected = true;
                break;
            }
            node = parent;
            parent = node.getParent();
        }
        setIsInsideLink(linkDetected);

        // Detect image at cursor
        const imageDetected = selection.getNodes().some($isImageNode);
        setIsOnImage(imageDetected);

        // Detect table at cursor
        setIsInsideTable($isInsideTable());

        // Detect container at cursor
        const container = $getContainerNode();
        setIsInsideContainer(container !== null);
        setContainerTag(container?.getTag() ?? '');
    }, [editor, defaultFontSizePx, defaultFontFamily, fontFamilies]);

    useEffect(() => {
        editor.getEditorState().read(() => {
            updateToolbar();
        });
        return mergeRegister(
            editor.registerUpdateListener(({ editorState }) => {
                editorState.read(() => {
                    updateToolbar();
                });
            }),
            editor.registerCommand(
                SELECTION_CHANGE_COMMAND,
                () => {
                    updateToolbar();
                    return false;
                },
                COMMAND_PRIORITY_LOW,
            ),
            editor.registerCommand(
                CLICK_COMMAND,
                (payload: MouseEvent) => {
                    const target = payload.target;
                    const rootElement = editor.getRootElement();
                    if (rootElement) {
                        rootElement.querySelectorAll('img').forEach((img) => img.removeAttribute('data-selected'));
                    }
                    if (target instanceof HTMLImageElement) {
                        target.setAttribute('data-selected', 'true');
                        editor.update(() => {
                            const node = $getNearestNodeFromDOMNode(target);
                            if ($isImageNode(node)) {
                                const nodeSelection = $createNodeSelection();
                                nodeSelection.add(node.getKey());
                                $setSelection(nodeSelection);
                            }
                        });
                        return true;
                    }
                    return false;
                },
                COMMAND_PRIORITY_LOW,
            ),
        );
    }, [editor, updateToolbar]);

    const selectHeading = (value: string) => {
        const heading = value as typeof blockType;
        setBlockType(editor, heading);
    };

    const openLinkModal = useCallback(() => {
        editor.focus();
        let url = '';
        let displayText = '';
        let linkNodeKey: string | null = null;

        editor.getEditorState().read(() => {
            const selection = $getSelection();
            if ($isRangeSelection(selection)) {
                // Walk up to find a parent LinkNode
                let node = selection.anchor.getNode();
                let parent = node.getParent();
                while (parent) {
                    if ($isLinkNode(parent)) {
                        url = parent.getURL();
                        displayText = parent.getTextContent();
                        linkNodeKey = parent.getKey();
                        break;
                    }
                    node = parent;
                    parent = node.getParent();
                }

                // If no existing link, use selected text as display text
                if (!url && !selection.isCollapsed()) {
                    displayText = selection.getTextContent();
                }
            }
        });

        setModalError('');
        setModalState({ ...DEFAULT_MODAL_STATE, url, displayText, linkNodeKey });
        setModalType('link');
    }, [editor]);

    const openImageModal = useCallback(async () => {
        let hasExistingImage = false;
        editor.getEditorState().read(() => {
            const selection = $getSelection();
            if ($isRangeSelection(selection) || $isNodeSelection(selection)) {
                hasExistingImage = selection.getNodes().some($isImageNode);
            }
        });

        if (!hasExistingImage && isSnowRelated && !snowSysId && onRequireSnowRecord) {
            const acquiredSysId = await onRequireSnowRecord();
            if (!acquiredSysId) {
                return;
            }
        }

        editor.focus();
        let url = '';
        let altText = '';
        let width = '';
        let height = '';
        let imgAlignment: ImageAlignment = 'center';

        editor.getEditorState().read(() => {
            const selection = $getSelection();
            if ($isRangeSelection(selection) || $isNodeSelection(selection)) {
                const node = selection.getNodes().find($isImageNode);
                if (node) {
                    url = node.getSrc();
                    altText = node.getAlt() ?? '';
                    const rawWidth = node.getWidth() ?? '';
                    const rawHeight = node.getHeight() ?? '';
                    width = rawWidth.replace(/[^0-9]/g, '');
                    height = rawHeight.replace(/[^0-9]/g, '');
                    imgAlignment = node.getAlignment() ?? 'center';
                }
            }
        });

        if (width && height && Number(height) > 0) {
            aspectRatioRef.current = Number(width) / Number(height);
        } else {
            aspectRatioRef.current = null;
        }

        setIsRatioLocked(true);
        setModalError('');
        setSelectedImageFile(null);
        setIsUploadingSnowImage(false);
        setModalState({ ...DEFAULT_MODAL_STATE, url, altText, width, height, alignment: imgAlignment });
        setModalType('image');
    }, [editor, isSnowRelated, snowSysId, onRequireSnowRecord]);

    const openContainerModal = useCallback(() => {
        editor.focus();
        let tag = 'div';
        let cls = '';
        let style = '';

        editor.getEditorState().read(() => {
            const container = $getContainerNode();
            if (container) {
                tag = container.getTag();
                cls = container.getOriginalClass();
                style = container.getOriginalStyle();
            }
        });

        setModalError('');
        setModalState({ ...DEFAULT_MODAL_STATE, containerTag: tag, containerClass: cls, containerStyle: style });
        setModalType('container');
    }, [editor]);

    const closeModal = useCallback(() => {
        if (isUploadingSnowImage) {
            return;
        }
        if (previewBlobUrlRef.current) {
            URL.revokeObjectURL(previewBlobUrlRef.current);
            previewBlobUrlRef.current = null;
        }
        aspectRatioRef.current = null;
        setIsRatioLocked(true);
        setModalType(null);
        setModalError('');
        setSelectedImageFile(null);
        setIsUploadingSnowImage(false);
        setModalState(DEFAULT_MODAL_STATE);
    }, [isUploadingSnowImage]);

    const handleModalSubmit = useCallback(async () => {
        if (!modalType) {
            return;
        }

        if (modalType === 'link') {
            if (!validateUrl(modalState.url)) {
                setModalError('Please enter a valid URL.');
                return;
            }

            if (modalState.linkNodeKey) {
                // Editing an existing link - update by key (selection may be lost to modal)
                const key = modalState.linkNodeKey;
                const text = modalState.displayText.trim() || modalState.url;
                editor.update(() => {
                    const linkNode = $getNodeByKey(key);
                    if ($isLinkNode(linkNode)) {
                        linkNode.setURL(modalState.url);
                        const currentText = linkNode.getTextContent();
                        if (currentText !== text) {
                            // Insert new text node first, then remove old children
                            // (clearing first would make the node empty -> Lexical auto-deletes it)
                            const newTextNode = $createTextNode(text);
                            linkNode.append(newTextNode);
                            const children = linkNode.getChildren();
                            for (const child of children) {
                                if (child !== newTextNode) {
                                    child.remove();
                                }
                            }
                        }
                    }
                });
            } else {
                // Inserting a new link
                insertLink(editor, modalState.url, modalState.displayText.trim());
            }

            closeModal();
            return;
        }

        if (modalType === 'image') {
            if (isUploadingSnowImage) {
                setModalError('Please wait for the image upload to complete.');
                return;
            }

            const widthVal = modalState.width.trim();
            const heightVal = modalState.height.trim();
            const altText = modalState.altText.trim() || undefined;
            const widthWithPx = widthVal ? (widthVal.endsWith('%') || widthVal.endsWith('px') ? widthVal : `${widthVal}px`) : undefined;
            const heightWithPx = heightVal ? (heightVal.endsWith('%') || heightVal.endsWith('px') ? heightVal : `${heightVal}px`) : undefined;

            if (selectedImageFile) {
                if (isSnowUpload) {
                    if (selectedImageFile.size > MAX_SNOW_IMAGE_SIZE_BYTES) {
                        setModalError('Image size exceeds 50 MB limit for ServiceNow upload. Please upload a smaller image.');
                        return;
                    }

                    let activeSysId = snowSysId;
                    if (isSnowRelated && !activeSysId && onRequireSnowRecord) {
                        const acquiredSysId = await onRequireSnowRecord();
                        if (!acquiredSysId) {
                            return;
                        }
                        activeSysId = acquiredSysId;
                    }

                    if (!snowTableName || !activeSysId) {
                        setModalError('ServiceNow table or record information is missing for upload.');
                        return;
                    }

                    try {
                        setModalError('');
                        setIsUploadingSnowImage(true);

                        const attachment = await uploadSnowAttachment({
                            tableName: snowTableName,
                            tableSysId: activeSysId,
                            file: selectedImageFile,
                        });

                        if (!attachment?.sys_id) {
                            throw new Error('Failed to obtain attachment sys_id from ServiceNow');
                        }

                        const localBlobUrl = modalState.url;
                        const snowPath = `sys_attachment.do?sys_id=${attachment.sys_id}`;
                        if (urlMapRef.current) {
                            urlMapRef.current[localBlobUrl] = snowPath;
                        }

                        // Detach from previewBlobUrlRef so closeModal doesn't revoke the active editor blob URL
                        previewBlobUrlRef.current = null;

                        editImage(editor, localBlobUrl, altText, widthWithPx, heightWithPx, modalState.alignment);
                        closeModal();
                        return;
                    } catch (err) {
                        logger.error('Failed to upload image to ServiceNow', err);
                        setModalError(err instanceof Error ? err.message : 'Failed to upload image to ServiceNow.');
                        return;
                    } finally {
                        setIsUploadingSnowImage(false);
                    }
                } else {
                    if (selectedImageFile.size > MAX_NON_SNOW_IMAGE_SIZE_BYTES) {
                        setModalError('Image size exceeds 100 KB limit. Please upload a smaller image.');
                        return;
                    }
                    if (!modalState.url) {
                        setModalError('Please select or upload an image file.');
                        return;
                    }
                    if (!validateImageUrl(modalState.url)) {
                        setModalError('Please upload a valid image file.');
                        return;
                    }
                    editImage(editor, modalState.url, altText, widthWithPx, heightWithPx, modalState.alignment);
                    closeModal();
                    return;
                }
            }

            // No new file selected - updating existing image properties
            if (!modalState.url) {
                setModalError('Please select or upload an image file.');
                return;
            }
            if (!validateImageUrl(modalState.url)) {
                setModalError('Please upload a valid image file.');
                return;
            }
            editImage(editor, modalState.url, altText, widthWithPx, heightWithPx, modalState.alignment);
            closeModal();
            return;
        }

        if (modalType === 'table') {
            const rows = Number(modalState.rows);
            const columns = Number(modalState.columns);
            if (!Number.isInteger(rows) || rows < 1 || rows > 10) {
                setModalError('Rows must be a number between 1 and 10.');
                return;
            }
            if (!Number.isInteger(columns) || columns < 1 || columns > 10) {
                setModalError('Columns must be a number between 1 and 10.');
                return;
            }
            insertTable(editor, rows, columns);
            closeModal();
            return;
        }

        if (modalType === 'container') {
            const tag = modalState.containerTag.trim() || 'div';
            const cls = modalState.containerClass.trim();
            const style = modalState.containerStyle.trim();

            if (isInsideContainer) {
                updateContainer(editor, cls, style);
            } else {
                insertContainer(editor, tag, cls, style);
            }
            closeModal();
        }
    }, [
        modalType,
        modalState,
        closeModal,
        editor,
        isUploadingSnowImage,
        selectedImageFile,
        isSnowUpload,
        isSnowRelated,
        snowSysId,
        onRequireSnowRecord,
        snowTableName,
        urlMapRef,
        isInsideContainer,
    ]);

    const changeTextColor = (event: ChangeEvent<HTMLInputElement>) => {
        applyTextColor(editor, 'color', event.target.value);
    };

    const changeBackgroundColor = (event: ChangeEvent<HTMLInputElement>) => {
        applyTextColor(editor, 'background-color', event.target.value);
    };

    const modalTitle = useMemo(() => {
        if (modalType === 'link') return 'Insert or edit link';
        if (modalType === 'image') return 'Insert or edit image';
        if (modalType === 'table') return 'Insert table';
        if (modalType === 'container') return isInsideContainer ? `Edit container <${containerTag}>` : 'Insert container';
        return '';
    }, [modalType, isInsideContainer, containerTag]);

    const showRichText = extensions.richText !== false;
    const showLink = extensions.link !== false;
    const showList = extensions.list !== false;
    const showTable = extensions.table !== false;
    const showAlignment = extensions.alignment !== false;
    const showFontControls = extensions.fontControls !== false;
    const showTextCase = extensions.textCase !== false;
    const showColorAndClear = extensions.colorAndClear !== false;
    const showContainer = extensions.container !== false;

    return (
        <>
            <div className={twMerge('flex flex-wrap items-center gap-0.5 bg-slate-50 border-b border-slate-200 px-1.5 py-1', className)}>
                {/* Block type */}
                {showRichText && (
                    <>
                        <div className="flex items-center gap-0.5">
                            <SelectInput
                                className="min-w-24"
                                triggerClassName="h-7 text-xs"
                                value={blockType}
                                onChange={(val) => selectHeading(val)}
                                options={[
                                    { label: 'Normal (p)', value: 'normal' },
                                    { label: 'H1', value: 'h1' },
                                    { label: 'H2', value: 'h2' },
                                    { label: 'H3', value: 'h3' },
                                    { label: 'H4', value: 'h4' },
                                    { label: 'H5', value: 'h5' },
                                    { label: 'Quote', value: 'quote' },
                                    { label: 'Code', value: 'code' },
                                ]}
                                clearable={false}
                                aria-label="Block type"
                                title="Block type"
                            />
                        </div>
                        <div className={GROUP_DIVIDER} />
                    </>
                )}

                {/* Inline formatting */}
                {showRichText && (
                    <>
                        <div className="flex items-center gap-0.5">
                            <button
                                type="button"
                                className={twMerge(ICON_BUTTON, isBold && ICON_BUTTON_ACTIVE)}
                                aria-label="Bold"
                                title="Bold"
                                onClick={() => toggleTextFormat(editor, 'bold')}
                            >
                                <Bold size={14} />
                            </button>
                            <button
                                type="button"
                                className={twMerge(ICON_BUTTON, isItalic && ICON_BUTTON_ACTIVE)}
                                aria-label="Italic"
                                title="Italic"
                                onClick={() => toggleTextFormat(editor, 'italic')}
                            >
                                <Italic size={14} />
                            </button>
                            <button
                                type="button"
                                className={twMerge(ICON_BUTTON, isUnderline && ICON_BUTTON_ACTIVE)}
                                aria-label="Underline"
                                title="Underline"
                                onClick={() => toggleTextFormat(editor, 'underline')}
                            >
                                <Underline size={14} />
                            </button>
                            <button
                                type="button"
                                className={twMerge(ICON_BUTTON, isStrikethrough && ICON_BUTTON_ACTIVE)}
                                aria-label="Strikethrough"
                                title="Strikethrough"
                                onClick={() => toggleTextFormat(editor, 'strikethrough')}
                            >
                                <Strikethrough size={14} />
                            </button>
                            <button
                                type="button"
                                className={twMerge(ICON_BUTTON, isSubscript && ICON_BUTTON_ACTIVE)}
                                aria-label="Subscript"
                                title="Subscript"
                                onClick={() => toggleTextFormat(editor, 'subscript')}
                            >
                                <Subscript size={14} />
                            </button>
                            <button
                                type="button"
                                className={twMerge(ICON_BUTTON, isSuperscript && ICON_BUTTON_ACTIVE)}
                                aria-label="Superscript"
                                title="Superscript"
                                onClick={() => toggleTextFormat(editor, 'superscript')}
                            >
                                <Superscript size={14} />
                            </button>
                        </div>
                        <div className={GROUP_DIVIDER} />
                    </>
                )}

                {/* Lists */}
                {showList && (
                    <>
                        <div className="flex items-center gap-0.5">
                            <button
                                type="button"
                                className={twMerge(ICON_BUTTON, listType === 'bullet' && ICON_BUTTON_ACTIVE)}
                                aria-label="Bullet list"
                                title="Bullet list"
                                onClick={() => toggleListType(editor, 'bullet')}
                            >
                                <List size={14} />
                            </button>
                            <button
                                type="button"
                                className={twMerge(ICON_BUTTON, listType === 'number' && ICON_BUTTON_ACTIVE)}
                                aria-label="Numbered list"
                                title="Numbered list"
                                onClick={() => toggleListType(editor, 'number')}
                            >
                                <ListOrdered size={14} />
                            </button>
                        </div>
                        <div className={GROUP_DIVIDER} />
                    </>
                )}

                {/* Link & Image */}
                {showLink && (
                    <>
                        <div className="flex items-center gap-0.5">
                            <button
                                type="button"
                                className={twMerge(ICON_BUTTON, isInsideLink && ICON_BUTTON_ACTIVE)}
                                aria-label="Insert link"
                                title="Insert link"
                                onClick={openLinkModal}
                            >
                                <Link2 size={14} />
                            </button>
                            {isInsideLink && (
                                <button
                                    type="button"
                                    className={twMerge(ICON_BUTTON, 'text-amber-600 hover:text-amber-700')}
                                    aria-label="Edit link"
                                    title="Edit link"
                                    onClick={openLinkModal}
                                >
                                    <Pencil size={12} />
                                </button>
                            )}
                            <button
                                type="button"
                                className={twMerge(ICON_BUTTON, isOnImage && ICON_BUTTON_ACTIVE)}
                                aria-label="Insert image"
                                title="Insert image"
                                onClick={openImageModal}
                            >
                                <Image size={14} />
                            </button>
                            {isOnImage && (
                                <button
                                    type="button"
                                    className={twMerge(ICON_BUTTON, 'text-amber-600 hover:text-amber-700')}
                                    aria-label="Edit image"
                                    title="Edit image"
                                    onClick={openImageModal}
                                >
                                    <Pencil size={12} />
                                </button>
                            )}
                        </div>
                        <div className={GROUP_DIVIDER} />
                    </>
                )}

                {/* Table */}
                {showTable && (
                    <>
                        <div className="flex items-center gap-0.5">
                            <button type="button" className={ICON_BUTTON} aria-label="Insert table" title="Insert table" onClick={() => setModalType('table')}>
                                <Table size={14} />
                            </button>
                            {isInsideTable && (
                                <TableActionsDropdown
                                    onInsertRowAbove={() => insertTableRow(editor, false)}
                                    onInsertRowBelow={() => insertTableRow(editor, true)}
                                    onDeleteRow={() => deleteTableRow(editor)}
                                    onInsertColumnBefore={() => insertTableColumn(editor, false)}
                                    onInsertColumnAfter={() => insertTableColumn(editor, true)}
                                    onDeleteColumn={() => deleteTableColumn(editor)}
                                    onDeleteTable={() => deleteTable(editor)}
                                    onInsertParagraphAfter={() => insertParagraphAfterTable(editor)}
                                />
                            )}
                        </div>
                        <div className={GROUP_DIVIDER} />
                    </>
                )}

                {/* Container */}
                {showContainer && (
                    <>
                        <div className="flex items-center gap-0.5">
                            <button
                                type="button"
                                className={twMerge(ICON_BUTTON, isInsideContainer && ICON_BUTTON_ACTIVE)}
                                aria-label={isInsideContainer ? 'Edit container' : 'Insert container'}
                                title={isInsideContainer ? `Edit container <${containerTag}>` : 'Insert container'}
                                onClick={openContainerModal}
                            >
                                <Box size={14} />
                            </button>
                            {isInsideContainer && (
                                <button
                                    type="button"
                                    className={twMerge(ICON_BUTTON, 'text-red-500 hover:text-red-600')}
                                    aria-label="Remove container"
                                    title="Remove container"
                                    onClick={() => removeContainer(editor)}
                                >
                                    <Trash2 size={12} />
                                </button>
                            )}
                        </div>
                        <div className={GROUP_DIVIDER} />
                    </>
                )}

                {/* Alignment */}
                {showAlignment && (
                    <>
                        <div className="flex items-center gap-0.5">
                            <button
                                type="button"
                                className={twMerge(ICON_BUTTON, alignment === 'left' && ICON_BUTTON_ACTIVE)}
                                aria-label="Align left"
                                title="Align left"
                                onClick={() => setTextAlignment(editor, 'left')}
                            >
                                <AlignLeft size={14} />
                            </button>
                            <button
                                type="button"
                                className={twMerge(ICON_BUTTON, alignment === 'center' && ICON_BUTTON_ACTIVE)}
                                aria-label="Align center"
                                title="Align center"
                                onClick={() => setTextAlignment(editor, 'center')}
                            >
                                <AlignCenter size={14} />
                            </button>
                            <button
                                type="button"
                                className={twMerge(ICON_BUTTON, alignment === 'right' && ICON_BUTTON_ACTIVE)}
                                aria-label="Align right"
                                title="Align right"
                                onClick={() => setTextAlignment(editor, 'right')}
                            >
                                <AlignRight size={14} />
                            </button>
                            <button
                                type="button"
                                className={twMerge(ICON_BUTTON, alignment === 'justify' && ICON_BUTTON_ACTIVE)}
                                aria-label="Align justify"
                                title="Align justify"
                                onClick={() => setTextAlignment(editor, 'justify')}
                            >
                                <AlignJustify size={14} />
                            </button>
                        </div>
                        <div className={GROUP_DIVIDER} />
                    </>
                )}

                {/* Font family & size */}
                {showFontControls && (
                    <>
                        <div className="flex items-center gap-2">
                            <SelectInput
                                className="min-w-24"
                                triggerClassName="h-7 text-xs"
                                value={fontFamily}
                                onChange={(val) => {
                                    if (val) {
                                        setFontFamily(editor, val);
                                        setFontFamily_(val);
                                        editor.getEditorState().read(() => {
                                            const sel = $getSelection();
                                            if (!$isRangeSelection(sel) || sel.isCollapsed()) {
                                                setDefaultFontFamily(val);
                                            }
                                        });
                                    }
                                }}
                                options={fontFamilies.map((family) => ({ label: family, value: family }))}
                                clearable={false}
                                aria-label="Font family"
                                title="Font family"
                            />
                            <div className="flex items-center gap-0.5 shadow-2xs ring ring-zinc-300 rounded" title="font size">
                                <button
                                    type="button"
                                    className={ICON_BUTTON}
                                    aria-label="Decrease font size"
                                    title="Decrease font size"
                                    onClick={() => {
                                        let isRangeSelected = false;
                                        editor.getEditorState().read(() => {
                                            const sel = $getSelection();
                                            if ($isRangeSelection(sel) && !sel.isCollapsed()) {
                                                isRangeSelected = true;
                                            }
                                        });
                                        if (isRangeSelected) {
                                            adjustFontSize(editor, -1, defaultFontSize);
                                        } else {
                                            adjustFontSize(editor, -1, defaultFontSize);
                                            setDefaultFontSize(Math.max(8, defaultFontSize - 1));
                                        }
                                    }}
                                >
                                    <Minus size={14} />
                                </button>
                                <span
                                    className="inline-flex items-center justify-center min-w-14 h-7 text-[11px] text-slate-600 font-medium tabular-nums"
                                    aria-label="Current font size"
                                >
                                    {fontSize ?? defaultFontSizePx}
                                </span>
                                <button
                                    type="button"
                                    className={ICON_BUTTON}
                                    aria-label="Increase font size"
                                    title="Increase font size"
                                    onClick={() => {
                                        let isRangeSelected = false;
                                        editor.getEditorState().read(() => {
                                            const sel = $getSelection();
                                            if ($isRangeSelection(sel) && !sel.isCollapsed()) {
                                                isRangeSelected = true;
                                            }
                                        });
                                        if (isRangeSelected) {
                                            adjustFontSize(editor, 1, defaultFontSize);
                                        } else {
                                            adjustFontSize(editor, 1, defaultFontSize);
                                            setDefaultFontSize(Math.min(72, defaultFontSize + 1));
                                        }
                                    }}
                                >
                                    <Plus size={14} />
                                </button>
                            </div>
                        </div>
                        <div className={GROUP_DIVIDER} />
                    </>
                )}

                {/* Text case */}
                {showTextCase && (
                    <>
                        <div className="flex items-center gap-0.5">
                            <button type="button" className={ICON_BUTTON} aria-label="Uppercase" title="Uppercase" onClick={() => transformTextCase(editor, 'uppercase')}>
                                <CaseUpperIcon size={14} />
                            </button>
                            <button type="button" className={ICON_BUTTON} aria-label="Lowercase" title="Lowercase" onClick={() => transformTextCase(editor, 'lowercase')}>
                                <CaseLowerIcon size={14} />
                            </button>
                            <button type="button" className={ICON_BUTTON} aria-label="Capitalize" title="Capitalize" onClick={() => transformTextCase(editor, 'capitalize')}>
                                <ALargeSmall size={14} />
                            </button>
                        </div>
                        <div className={GROUP_DIVIDER} />
                    </>
                )}

                {/* Colors & clear */}
                {showColorAndClear && (
                    <div className="flex items-center gap-1">
                        <button type="button" className={ICON_BUTTON} title="Clear formatting" aria-label="Clear formatting" onClick={() => clearFormatting(editor)}>
                            <Eraser size={14} />
                        </button>
                        <label className={twMerge(COLOR_PICKER_LABEL, 'px-1 shadow-2xs ring ring-zinc-300 rounded-2xl')} title="Text color">
                            <Baseline size={14} />
                            <input type="color" className={COLOR_PICKER_INPUT} value={textColor} onChange={changeTextColor} aria-label="Text color" />
                        </label>
                        <label className={twMerge(COLOR_PICKER_LABEL, 'px-1 shadow-2xs ring ring-zinc-300 rounded-2xl')} title="Background color">
                            <PaintBucket size={14} />
                            <input type="color" className={COLOR_PICKER_INPUT} value={bgColor} onChange={changeBackgroundColor} aria-label="Background color" />
                        </label>
                    </div>
                )}
            </div>

            <ToolbarModal
                open={modalType !== null}
                title={modalTitle}
                error={modalError}
                confirmDisabled={isUploadingSnowImage}
                confirmText={isUploadingSnowImage ? 'Uploading...' : 'Confirm'}
                onClose={closeModal}
                onSubmit={handleModalSubmit}
            >
                {modalType === 'table' ? (
                    <div className="grid gap-3">
                        <label className={MODAL_LABEL}>
                            Rows
                            <NumberInput
                                className={MODAL_INPUT}
                                min={1}
                                max={10}
                                value={modalState.rows === '' ? undefined : Number(modalState.rows)}
                                onChange={(v) => setModalState((prev) => ({ ...prev, rows: v === undefined ? '' : String(v) }))}
                            />
                        </label>
                        <label className={MODAL_LABEL}>
                            Columns
                            <NumberInput
                                className={MODAL_INPUT}
                                min={1}
                                max={10}
                                value={modalState.columns === '' ? undefined : Number(modalState.columns)}
                                onChange={(v) => setModalState((prev) => ({ ...prev, columns: v === undefined ? '' : String(v) }))}
                            />
                        </label>
                    </div>
                ) : null}
                {modalType === 'link' ? (
                    <div className="grid gap-3">
                        <label className={MODAL_LABEL}>
                            Display text
                            <TextInput className={MODAL_INPUT} value={modalState.displayText} onChange={(val) => setModalState((prev) => ({ ...prev, displayText: val }))} />
                        </label>
                        <label className={MODAL_LABEL}>
                            Link URL
                            <TextInput className={MODAL_INPUT} value={modalState.url} onChange={(val) => setModalState((prev) => ({ ...prev, url: val }))} />
                        </label>
                    </div>
                ) : null}
                {modalType === 'image' ? (
                    <div className="grid gap-3">
                        <div className="flex flex-col gap-1.5 text-[13px] text-slate-700">
                            Upload Image
                            <FileUploadInput
                                inputRef={imageFileInputRef}
                                value={selectedImageFile ?? undefined}
                                onChange={handleImageFileChange}
                                onRemove={handleImageFileRemove}
                                disabled={isUploadingSnowImage}
                                accept="image/jpeg, image/jpg, image/png, image/gif, image/webp, image/svg+xml"
                                title={isUploadingSnowImage ? 'Uploading to ServiceNow...' : 'Upload Image File'}
                                infoText={
                                    isSnowUpload
                                        ? '<b>Max size:</b> 50 MB | <b>Formats:</b> JPG, JPEG, PNG, GIF, WEBP, SVG (Uploaded to ServiceNow on confirm)'
                                        : '<b>Max size:</b> 100 KB | <b>Formats:</b> JPG, JPEG, PNG, GIF, WEBP, SVG'
                                }
                            />
                        </div>
                        {isUploadingSnowImage && <div className="text-center text-xs text-blue-600 font-medium animate-pulse">Uploading attachment to ServiceNow...</div>}
                        {modalState.url ? (
                            <div className="flex flex-col items-center gap-1.5 p-2 border border-slate-200 rounded-[10px] bg-slate-50">
                                <span className="text-xs text-slate-500 font-medium">Image Preview:</span>
                                <img
                                    src={modalState.url}
                                    alt={modalState.altText || 'Preview'}
                                    className="max-h-36 max-w-full object-contain rounded"
                                    onLoad={(e) => {
                                        const img = e.currentTarget;
                                        if (img.naturalWidth && img.naturalHeight) {
                                            const ratio = img.naturalWidth / img.naturalHeight;
                                            aspectRatioRef.current = ratio;
                                            setModalState((prev) => {
                                                if (!prev.width && !prev.height) {
                                                    return {
                                                        ...prev,
                                                        width: String(img.naturalWidth),
                                                        height: String(img.naturalHeight),
                                                    };
                                                }
                                                if (prev.width && !prev.height) {
                                                    const w = Number(prev.width);
                                                    if (w > 0) {
                                                        return { ...prev, height: String(Math.round(w / ratio)) };
                                                    }
                                                }
                                                if (!prev.width && prev.height) {
                                                    const h = Number(prev.height);
                                                    if (h > 0) {
                                                        return { ...prev, width: String(Math.round(h * ratio)) };
                                                    }
                                                }
                                                return prev;
                                            });
                                        }
                                    }}
                                />
                            </div>
                        ) : null}
                        <label className={MODAL_LABEL}>
                            Alt text
                            <TextInput
                                className={MODAL_INPUT}
                                placeholder="Description for accessibility (optional)"
                                value={modalState.altText}
                                onChange={(val) => setModalState((prev) => ({ ...prev, altText: val }))}
                            />
                        </label>
                        <div className="grid grid-cols-[1fr_auto_1fr] items-end gap-2">
                            <label className={MODAL_LABEL}>
                                Width (px)
                                <NumberInput
                                    className={MODAL_INPUT}
                                    placeholder="Width"
                                    min={1}
                                    value={modalState.width ? Number(modalState.width) : undefined}
                                    onChange={handleWidthChange}
                                />
                            </label>
                            <button
                                type="button"
                                className={twMerge(
                                    'p-2.5 rounded-[10px] border transition-colors mb-0.5 flex items-center justify-center cursor-pointer',
                                    isRatioLocked
                                        ? 'bg-blue-50 border-blue-300 text-blue-600 hover:bg-blue-100'
                                        : 'bg-slate-50 border-slate-300 text-slate-400 hover:text-slate-600',
                                )}
                                onClick={toggleRatioLock}
                                title={isRatioLocked ? 'Aspect ratio locked' : 'Aspect ratio unlocked'}
                                aria-label={isRatioLocked ? 'Aspect ratio locked' : 'Aspect ratio unlocked'}
                            >
                                {isRatioLocked ? <Lock size={16} /> : <Unlock size={16} />}
                            </button>
                            <label className={MODAL_LABEL}>
                                Height (px)
                                <NumberInput
                                    className={MODAL_INPUT}
                                    placeholder="Height"
                                    min={1}
                                    value={modalState.height ? Number(modalState.height) : undefined}
                                    onChange={handleHeightChange}
                                />
                            </label>
                        </div>
                        <label className={MODAL_LABEL}>
                            Alignment
                            <SelectInput
                                className={MODAL_INPUT}
                                value={modalState.alignment}
                                onChange={(val) =>
                                    setModalState((prev) => ({
                                        ...prev,
                                        alignment: val as ImageAlignment,
                                    }))
                                }
                                options={[
                                    { label: 'Left', value: 'left' },
                                    { label: 'Center', value: 'center' },
                                    { label: 'Right', value: 'right' },
                                    { label: 'Justify', value: 'justify' },
                                ]}
                                clearable={false}
                            />
                        </label>
                    </div>
                ) : null}
                {modalType === 'container' ? (
                    <div className="grid gap-3">
                        {!isInsideContainer && (
                            <label className={MODAL_LABEL}>
                                Tag
                                <SelectInput
                                    className={MODAL_INPUT}
                                    value={modalState.containerTag}
                                    onChange={(val) => setModalState((prev) => ({ ...prev, containerTag: val }))}
                                    options={[
                                        { label: 'div', value: 'div' },
                                        { label: 'section', value: 'section' },
                                        { label: 'article', value: 'article' },
                                        { label: 'aside', value: 'aside' },
                                        { label: 'header', value: 'header' },
                                        { label: 'footer', value: 'footer' },
                                        { label: 'nav', value: 'nav' },
                                        { label: 'main', value: 'main' },
                                    ]}
                                    clearable={false}
                                />
                            </label>
                        )}
                        <label className={MODAL_LABEL}>
                            CSS Classes
                            <TextInput
                                className={MODAL_INPUT}
                                placeholder="e.g. container my-4 bg-light"
                                value={modalState.containerClass}
                                onChange={(val) => setModalState((prev) => ({ ...prev, containerClass: val }))}
                            />
                        </label>
                        <label className={MODAL_LABEL}>
                            Inline Styles
                            <TextInput
                                className={MODAL_INPUT}
                                placeholder="e.g. padding: 1rem; background: #f0f0f0"
                                value={modalState.containerStyle}
                                onChange={(val) => setModalState((prev) => ({ ...prev, containerStyle: val }))}
                            />
                        </label>
                    </div>
                ) : null}
            </ToolbarModal>
        </>
    );
}
