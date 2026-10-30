import { useCallback, useEffect, useId, useMemo, useRef, useState, type FC, type ReactNode } from 'react';
import { twMerge, type ClassNameValue } from 'tailwind-merge';
import { LexicalComposer, type InitialConfigType } from '@lexical/react/LexicalComposer';
import { RichTextPlugin } from '@lexical/react/LexicalRichTextPlugin';
import { ContentEditable } from '@lexical/react/LexicalContentEditable';
import { HistoryPlugin } from '@lexical/react/LexicalHistoryPlugin';
import { AutoFocusPlugin } from '@lexical/react/LexicalAutoFocusPlugin';
import { LexicalErrorBoundary } from '@lexical/react/LexicalErrorBoundary';
import { ParagraphNode, TextNode, $getRoot, $isElementNode, $isDecoratorNode, $createParagraphNode, type LexicalEditor, type EditorThemeClasses } from 'lexical';
import { HeadingNode, QuoteNode } from '@lexical/rich-text';
import { CodeBlockNode } from './nodes/CodeBlockNode';
import { ContainerNode } from './nodes/ContainerNode';
import { ListNode, ListItemNode } from '@lexical/list';
import { TableNode, TableRowNode, TableCellNode } from '@lexical/table';
import { LinkNode, AutoLinkNode } from '@lexical/link';
import { $generateNodesFromDOM } from '@lexical/html';
import { Save } from 'lucide-react';
import logger from '@/shared/utils/logger';
import { downloadSnowAttachment } from '@/shared/modules/servicenow/services/download-snow-attachment';
import defaultTheme from './themes/default/default-theme';
import './themes/default/default-style.css';
import sopTheme, { SOP_THEME_CLASS } from './themes/sop/sop-theme';
import './themes/sop/sop-style.css';
import ToolbarPlugin from './plugins/ToolbarPlugin';
import EditorExtensionsPlugin from './plugins/EditorExtensionsPlugin';
import ShadowDomSelectionPlugin from './plugins/ShadowDomSelectionPlugin';
import { exportEditorHtml, type ExportOptions } from './utils/exportHtml';
import { sanitizeHtml } from './utils/sanitizeHtml';
import { mergeOriginalAttributes, mergeInlineStyles, type MergeAttributeOptions } from './utils/mergeOriginalClasses';
import { scopeCss } from './utils/scopeCss';
import { ImageNode } from './nodes/ImageNode';
import RichTextEditorContext, {
    useRichTextEditorContext,
    type EditorExtensionsOptions,
    type RichTextEditorContextValue,
    type RichTextEditorActions,
} from './RichTextEditorContext';
import { DEFAULT_FONT_FAMILIES, normalizeFontFamily, normalizeFontSize } from './config/style-config';
import type { SnowTableName } from '../servicenow/types/ticket';

const placeholder = '';

export type RichTextEditorTheme = 'default' | 'sop';

const EDITOR_THEMES: Record<RichTextEditorTheme, { theme: EditorThemeClasses; className: string }> = {
    default: { theme: defaultTheme, className: '' },
    sop: { theme: sopTheme, className: SOP_THEME_CLASS },
};

function onError(error: unknown) {
    logger.error(error);
}

interface SubComponentProps {
    className?: ClassNameValue;
}

export type { MergeAttributeOptions as PreserveInitialHtmlOptions };

interface RichTextEditorProps {
    children?: ReactNode;
    className?: ClassNameValue;
    initialHtml?: string;
    /** Controlled editable state - when provided, parent owns edit mode */
    isEditable?: boolean;
    /** Callback when editable state changes (for controlled mode) */
    onEditableChange?: (editable: boolean) => void;
    onSave?: (htmlDocument: string) => void;
    /** Called when copy HTML is triggered */
    onCopyHtml?: (html: string) => void;
    /** Ref to imperatively call save/discard/copyHtml from outside the editor tree */
    actionsRef?: React.RefObject<RichTextEditorActions | null>;
    /** Enable/disable specific editor extensions */
    extensions?: EditorExtensionsOptions;
    /**
     * Preserve parts of the initial HTML through the editor round-trip.
     * When provided, the specified parts are kept alongside editor output.
     *
     * - `classes` - keep original CSS classes on elements alongside editor classes
     * - `styles` - keep original inline styles on elements
     * - `head` - keep original `<head>` content (style, meta, title, link tags)
     *
     * Omit entirely to disable all preservation (default editor behaviour).
     */
    preserveInitialHtml?: MergeAttributeOptions;
    /** Whether the editor content is for ServiceNow (SNOW) records (defaults to true) */
    isSnowRelated?: boolean;
    /** ServiceNow table name (e.g. 'kb_knowledge') for attachment uploads */
    snowTableName?: SnowTableName;
    /** ServiceNow record sys_id for attachment uploads */
    snowSysId?: string;
    /** Callback to prompt/create ServiceNow draft record if sys_id is missing when uploading an image */
    onRequireSnowRecord?: () => Promise<string | null>;
    /** Default editor font size in px (defaults to 16) */
    defaultFontSize?: number | string;
    /** Callback when default editor font size changes */
    onDefaultFontSizeChange?: (size: number) => void;
    /** Default editor font family (defaults to 'Arial') */
    defaultFontFamily?: string;
    /** Callback when default editor font family changes */
    onDefaultFontFamilyChange?: (family: string) => void;
    /** List of font families available in the toolbar */
    fontFamilies?: string[];
    /** Visual theme for editor content (defaults to 'default') */
    theme?: RichTextEditorTheme;
}

interface RichTextEditorComposition {
    Toolbar: FC<SubComponentProps>;
    Content: FC<SubComponentProps>;
    ActionBar: FC<SubComponentProps>;
}

// --- Sub-components ---

const Toolbar: FC<SubComponentProps> = ({ className }) => {
    const { isEditable } = useRichTextEditorContext();
    if (!isEditable) return null;
    return <ToolbarPlugin className={className} />;
};
Toolbar.displayName = 'RichTextEditor.Toolbar';

const Content: FC<SubComponentProps> = ({ className }) => {
    const { defaultFontSizePx, defaultFontFamily } = useRichTextEditorContext();
    return (
        <div className={twMerge('bg-white relative min-h-80 max-h-80 overflow-auto', className)}>
            <RichTextPlugin
                contentEditable={
                    <ContentEditable
                        className="editor-body min-h-37.5 resize-none caret-black! relative tab-1 outline-none py-4 px-2.5 whitespace-pre-wrap"
                        style={
                            {
                                fontSize: defaultFontSizePx,
                                fontFamily: defaultFontFamily,
                                '--rte-font-size': defaultFontSizePx,
                                '--rte-font-family': defaultFontFamily,
                            } as React.CSSProperties
                        }
                        aria-placeholder={placeholder}
                        placeholder={
                            <div
                                className="text-gray-400 overflow-hidden absolute text-ellipsis top-4 left-2.5 select-none inline-block pointer-events-none"
                                style={{ fontSize: defaultFontSizePx, fontFamily: defaultFontFamily }}
                            >
                                {placeholder}
                            </div>
                        }
                    />
                }
                ErrorBoundary={LexicalErrorBoundary}
            />
            <HistoryPlugin />
            <AutoFocusPlugin />
        </div>
    );
};
Content.displayName = 'RichTextEditor.Content';

const ACTION_BUTTON_BASE =
    'inline-flex items-center gap-2 border rounded-lg px-3.5 py-2 cursor-pointer font-semibold text-[13px] transition-all hover:brightness-95 disabled:cursor-not-allowed disabled:opacity-55';

const ActionBar: FC<SubComponentProps> = ({ className }) => {
    const { isEditable, isEditorReady, startEditing, discardChanges, saveHtml } = useRichTextEditorContext();

    return (
        <div className={twMerge('flex gap-2.5 flex-wrap p-3 border-t border-slate-300/20 bg-white justify-end', className)}>
            {!isEditable ? (
                <button className={twMerge(ACTION_BUTTON_BASE, 'bg-blue-600 text-white border-transparent')} type="button" onClick={startEditing} disabled={!isEditorReady}>
                    <Save size={16} />
                    <span>{isEditorReady ? 'Edit' : 'Loading...'}</span>
                </button>
            ) : (
                <>
                    <button className={twMerge(ACTION_BUTTON_BASE, 'bg-slate-50 text-gray-900 border-slate-300')} type="button" onClick={discardChanges} disabled={!isEditorReady}>
                        Discard
                    </button>
                    <button className={twMerge(ACTION_BUTTON_BASE, 'bg-green-600 text-white border-transparent')} type="button" onClick={saveHtml} disabled={!isEditorReady}>
                        <Save size={16} />
                        <span>Save</span>
                    </button>
                </>
            )}
        </div>
    );
};
ActionBar.displayName = 'RichTextEditor.ActionBar';

// --- Main component ---

const RichTextEditor: FC<RichTextEditorProps> & RichTextEditorComposition = ({
    children,
    className,
    initialHtml,
    isEditable: controlledEditable,
    onEditableChange,
    onSave,
    onCopyHtml,
    actionsRef,
    extensions = {},
    preserveInitialHtml,
    isSnowRelated = true,
    snowTableName,
    snowSysId,
    onRequireSnowRecord,
    defaultFontSize,
    onDefaultFontSizeChange,
    defaultFontFamily,
    onDefaultFontFamilyChange,
    fontFamilies,
    theme = 'default',
}) => {
    const scopeId = useId();
    const isControlled = controlledEditable !== undefined;
    const [internalEditable, setInternalEditable] = useState(false);
    const isEditable = isControlled ? controlledEditable : internalEditable;

    const resolvedFontFamilies = useMemo(() => (fontFamilies && fontFamilies.length > 0 ? fontFamilies : DEFAULT_FONT_FAMILIES), [fontFamilies]);

    const [currentFontSize, setCurrentFontSize] = useState<number>(() => normalizeFontSize(defaultFontSize));
    const [currentFontFamily, setCurrentFontFamily] = useState<string>(() => normalizeFontFamily(defaultFontFamily, resolvedFontFamilies));

    useEffect(() => {
        if (defaultFontSize !== undefined) {
            setCurrentFontSize(normalizeFontSize(defaultFontSize));
        }
    }, [defaultFontSize]);

    useEffect(() => {
        if (defaultFontFamily !== undefined) {
            setCurrentFontFamily(normalizeFontFamily(defaultFontFamily, resolvedFontFamilies));
        }
    }, [defaultFontFamily, resolvedFontFamilies]);

    const setDefaultFontSize = useCallback(
        (size: number | string) => {
            const normalized = normalizeFontSize(size);
            setCurrentFontSize(normalized);
            onDefaultFontSizeChange?.(normalized);
        },
        [onDefaultFontSizeChange],
    );

    const setDefaultFontFamily = useCallback(
        (family: string) => {
            const normalized = normalizeFontFamily(family, resolvedFontFamilies);
            setCurrentFontFamily(normalized);
            onDefaultFontFamilyChange?.(normalized);
        },
        [resolvedFontFamilies, onDefaultFontFamilyChange],
    );

    const currentFontSizePx = useMemo(() => `${currentFontSize}px`, [currentFontSize]);

    /** Maps local blob URLs (e.g. blob:http://...) to SNOW attachment URLs (sys_attachment.do?sys_id=...) */
    const urlMapRef = useRef<Record<string, string>>({});

    // Cleanup revoked blob URLs when editor unmounts
    useEffect(() => {
        return () => {
            if (urlMapRef.current) {
                Object.keys(urlMapRef.current).forEach((blobUrl) => {
                    if (blobUrl.startsWith('blob:')) {
                        URL.revokeObjectURL(blobUrl);
                    }
                });
            }
        };
    }, []);

    const [isDownloadingImages, setIsDownloadingImages] = useState(false);
    const [editorInstance, setEditorInstance] = useState<LexicalEditor | null>(null);
    const [isEditorReady, setIsEditorReady] = useState(false);
    const [savedHtml, setSavedHtml] = useState(initialHtml ?? '');
    const hasLoadedInitialHtml = useRef(false);
    const justSavedRef = useRef(false);

    // Refs for preserved initial HTML parts
    const initialHeadContentRef = useRef('');
    const originalBodyHtmlRef = useRef('');
    const originalBodyAttrsRef = useRef<Record<string, string>>({});
    /** CSS text extracted from original <style> tags - injected into editor container */
    const [injectedStyles, setInjectedStyles] = useState('');

    const initialConfig = useMemo<InitialConfigType>(
        () => ({
            namespace: 'rich-text-editor',
            nodes: [
                ParagraphNode,
                TextNode,
                HeadingNode,
                QuoteNode,
                CodeBlockNode,
                ContainerNode,
                ListNode,
                ListItemNode,
                TableNode,
                TableRowNode,
                TableCellNode,
                LinkNode,
                AutoLinkNode,
                ImageNode,
            ],
            theme: EDITOR_THEMES[theme].theme,
            onError,
        }),
        [theme],
    );

    const handleEditorReady = useCallback((editor: LexicalEditor) => {
        setEditorInstance(editor);
        setIsEditorReady(true);
    }, []);

    useEffect(() => {
        const newHtml = initialHtml ?? '';
        setSavedHtml(newHtml);
        if (justSavedRef.current) {
            // Parent echoed back what we just saved - editor state is authoritative,
            // don't re-parse HTML (which would lose inline styles like color)
            return;
        }
        hasLoadedInitialHtml.current = false;
    }, [initialHtml]);

    const getExportOptions = useCallback((): ExportOptions => {
        const opts: ExportOptions = {
            urlMap: urlMapRef.current,
            defaultFontSize: currentFontSize,
            defaultFontFamily: currentFontFamily,
        };
        if (preserveInitialHtml) {
            opts.initialHeadContent = initialHeadContentRef.current;
            opts.originalBodyHtml = originalBodyHtmlRef.current;
            opts.originalBodyAttrs = originalBodyAttrsRef.current;
            opts.preserve = preserveInitialHtml;
        }
        return opts;
    }, [preserveInitialHtml, currentFontSize, currentFontFamily]);

    const restoreEditorContent = useCallback(
        async (html: string) => {
            if (!editorInstance) return;

            let processedHtml = html;
            if (isSnowRelated && processedHtml) {
                // Match sys_attachment.do?sys_id= (supporting =, &#61;, &equals;, %3D) followed by 32 hex chars
                // const regex =  /\/?sys_attachment\.do\?sys_id(?:=|=|&#61;|&equals;|%3D)([a-f0-9]{32})/gi;
                const regex = /(src\s*=\s*["']?https?:\/\/[^"'\s>]{0,2000})?\/?sys_attachment\.do\?sys_id(?:=|&#61;|&equals;|%3D)([a-f0-9]{32})/gi;
                const uniqueSysIds = [...processedHtml.matchAll(regex)].filter((m) => !m[1]).map((m) => m[2]);
                // const matches = Array.from(processedHtml.matchAll(regex));
                // const uniqueSysIds = [...new Set(matches.map((m) => m[1]))];

                if (uniqueSysIds.length > 0) {
                    setIsDownloadingImages(true);
                }

                try {
                    for (const sysId of uniqueSysIds) {
                        const standardSnowPath = `/sys_attachment.do?sys_id=${sysId}`;
                        const variants = [
                            `/sys_attachment.do?sys_id=${sysId}`,
                            `/sys_attachment.do?sys_id&#61;${sysId}`,
                            `/sys_attachment.do?sys_id&equals;${sysId}`,
                            `/sys_attachment.do?sys_id%3D${sysId}`,
                            `sys_attachment.do?sys_id=${sysId}`,
                            `sys_attachment.do?sys_id&#61;${sysId}`,
                            `sys_attachment.do?sys_id&equals;${sysId}`,
                            `sys_attachment.do?sys_id%3D${sysId}`,
                        ];

                        let existingBlobUrl = Object.keys(urlMapRef.current).find((key) => urlMapRef.current[key] === standardSnowPath);

                        if (!existingBlobUrl) {
                            try {
                                const { blob } = await downloadSnowAttachment({ attachmentSysId: sysId, fileName: 'image' });
                                existingBlobUrl = URL.createObjectURL(blob);
                                urlMapRef.current[existingBlobUrl] = standardSnowPath;
                            } catch (err) {
                                logger.error(`Failed to download SNOW attachment ${sysId}`, err);
                                const errorSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="320" height="90" viewBox="0 0 320 90">
                                  <rect width="320" height="90" fill="#fef2f2" stroke="#fca5a5" stroke-width="1.5" rx="8"/>
                                  <text x="160" y="38" font-family="sans-serif" font-size="13" font-weight="bold" fill="#dc2626" text-anchor="middle">Failed to load ServiceNow attachment</text>
                                  <text x="160" y="60" font-family="sans-serif" font-size="11" fill="#991b1b" text-anchor="middle">sys_id: ${sysId}</text>
                                </svg>`;
                                existingBlobUrl = `data:image/svg+xml;utf8,${encodeURIComponent(errorSvg)}`;
                            }
                        }

                        if (existingBlobUrl) {
                            for (const variant of variants) {
                                processedHtml = processedHtml.replaceAll(variant, existingBlobUrl);
                            }
                        }
                    }
                } finally {
                    setIsDownloadingImages(false);
                }
            }

            const domParser = new DOMParser();
            // Parse the full document first to preserve <head> and <style> tags
            const htmlDocument = domParser.parseFromString(processedHtml, 'text/html');

            // Store original head content, body HTML, and body attributes
            initialHeadContentRef.current = htmlDocument.head.innerHTML;
            const sanitizedBody = sanitizeHtml(htmlDocument.body.innerHTML);
            htmlDocument.body.innerHTML = sanitizedBody;
            originalBodyHtmlRef.current = sanitizedBody;
            originalBodyAttrsRef.current = {
                class: htmlDocument.body.getAttribute('class') ?? '',
                style: htmlDocument.body.getAttribute('style') ?? '',
            };

            // Extract <style> CSS from head for injection into the editor container
            if (preserveInitialHtml?.head) {
                const styleContent = Array.from(htmlDocument.head.querySelectorAll('style'))
                    .map((s) => s.textContent ?? '')
                    .filter(Boolean)
                    .join('\n');
                setInjectedStyles(styleContent);
            } else {
                setInjectedStyles('');
            }

            editorInstance.update(() => {
                const root = $getRoot();
                root.clear();
                if (sanitizedBody) {
                    const nodes = $generateNodesFromDOM(editorInstance, htmlDocument.body);
                    let currentParagraph: ParagraphNode | null = null;
                    nodes.forEach((node) => {
                        if ($isElementNode(node) || $isDecoratorNode(node)) {
                            currentParagraph = null;
                            root.append(node);
                        } else {
                            const textContent = node.getTextContent();
                            if (!currentParagraph && textContent.trim() === '') {
                                return;
                            }
                            if (!currentParagraph) {
                                currentParagraph = $createParagraphNode();
                                root.append(currentParagraph);
                            }
                            currentParagraph.append(node);
                        }
                    });
                }
            });

            // After Lexical commits the DOM, merge original attributes onto editor elements
            if (preserveInitialHtml?.classes || preserveInitialHtml?.styles) {
                const bodyAttrs = originalBodyAttrsRef.current;
                const removeListener = editorInstance.registerUpdateListener(() => {
                    removeListener();
                    const rootElement = editorInstance.getRootElement();
                    if (!rootElement) return;

                    // Merge original classes/styles on child elements
                    if (sanitizedBody) {
                        const originalDoc = domParser.parseFromString(`<body>${sanitizedBody}</body>`, 'text/html');
                        mergeOriginalAttributes(rootElement, originalDoc.body, preserveInitialHtml);
                    }

                    // Apply original <body> tag attributes to the editor root element
                    if (preserveInitialHtml.classes && bodyAttrs.class) {
                        const current = rootElement.getAttribute('class') ?? '';
                        const merged = [...new Set([...bodyAttrs.class.split(/\s+/), ...current.split(/\s+/)])].filter(Boolean).join(' ');
                        rootElement.setAttribute('class', merged);
                    }
                    if (preserveInitialHtml.styles && bodyAttrs.style) {
                        const current = rootElement.getAttribute('style') ?? '';
                        rootElement.setAttribute('style', mergeInlineStyles(bodyAttrs.style, current));
                    }
                });
            }
        },
        [editorInstance, preserveInitialHtml],
    );

    useEffect(() => {
        if (!editorInstance || hasLoadedInitialHtml.current) return;
        restoreEditorContent(savedHtml);
        hasLoadedInitialHtml.current = true;
    }, [editorInstance, restoreEditorContent, savedHtml]);

    // Inject scoped <style> into <head> so original CSS only affects this editor instance
    useEffect(() => {
        if (!injectedStyles) return;
        const scopeSelector = `[data-rte-scope="${scopeId}"]`;
        const scoped = scopeCss(injectedStyles, scopeSelector);
        if (!scoped) return;

        const styleEl = document.createElement('style');
        styleEl.textContent = scoped;
        // Inject into shadow root if available, otherwise document.head
        const shadowRoot = document.getElementById('itops-mfe-root')?.shadowRoot;
        (shadowRoot ?? document.head).appendChild(styleEl);

        return () => {
            styleEl.remove();
        };
    }, [injectedStyles, scopeId]);

    const updateEditable = useCallback(
        (value: boolean) => {
            if (isControlled) {
                onEditableChange?.(value);
            } else {
                setInternalEditable(value);
            }
        },
        [isControlled, onEditableChange],
    );

    const startEditing = useCallback(() => {
        updateEditable(true);
        editorInstance?.focus();
    }, [editorInstance, updateEditable]);

    const discardChanges = useCallback(() => {
        restoreEditorContent(savedHtml);
        updateEditable(false);
    }, [restoreEditorContent, savedHtml, updateEditable]);

    const saveHtml = useCallback(() => {
        if (!editorInstance) return;
        const html = exportEditorHtml(editorInstance, getExportOptions());
        setSavedHtml(html);
        justSavedRef.current = true;
        updateEditable(false);
        onSave?.(html);
    }, [editorInstance, getExportOptions, onSave, updateEditable]);

    const copyHtml = useCallback(() => {
        if (!editorInstance) return '';
        const html = exportEditorHtml(editorInstance, getExportOptions());
        onCopyHtml?.(html);
        return html;
    }, [editorInstance, getExportOptions, onCopyHtml]);

    // Auto-restore content when controlled isEditable transitions true -> false (discard only)
    const prevEditableRef = useRef(isEditable);
    useEffect(() => {
        if (isControlled && prevEditableRef.current === true && isEditable === false) {
            if (justSavedRef.current) {
                // Save just happened - editor already has correct state, skip restore
                justSavedRef.current = false;
            } else {
                // Discard - restore from last saved HTML
                restoreEditorContent(savedHtml);
            }
        }
        prevEditableRef.current = isEditable;
    }, [isControlled, isEditable, restoreEditorContent, savedHtml]);

    // Expose imperative actions to parent via actionsRef
    useEffect(() => {
        if (!actionsRef) return;
        (actionsRef as React.RefObject<RichTextEditorActions | null>).current = {
            save: saveHtml,
            discard: discardChanges,
            getHtml: () => (editorInstance ? exportEditorHtml(editorInstance, getExportOptions()) : ''),
            copyHtml,
            setDefaultFontSize,
            setDefaultFontFamily,
        };
        return () => {
            (actionsRef as React.RefObject<RichTextEditorActions | null>).current = null;
        };
    }, [actionsRef, saveHtml, discardChanges, copyHtml, editorInstance, getExportOptions, setDefaultFontSize, setDefaultFontFamily]);

    const contextValue = useMemo<RichTextEditorContextValue>(
        () => ({
            editorInstance,
            isEditorReady,
            isEditable,
            savedHtml,
            extensions,
            startEditing,
            discardChanges,
            saveHtml,
            copyHtml,
            setEditorInstance: handleEditorReady,
            restoreEditorContent,
            isSnowRelated,
            snowTableName,
            snowSysId,
            onRequireSnowRecord,
            urlMapRef,
            defaultFontSize: currentFontSize,
            defaultFontSizePx: currentFontSizePx,
            defaultFontFamily: currentFontFamily,
            fontFamilies: resolvedFontFamilies,
            setDefaultFontSize,
            setDefaultFontFamily,
        }),
        [
            editorInstance,
            isEditorReady,
            isEditable,
            savedHtml,
            extensions,
            startEditing,
            discardChanges,
            saveHtml,
            copyHtml,
            handleEditorReady,
            restoreEditorContent,
            isSnowRelated,
            snowTableName,
            snowSysId,
            onRequireSnowRecord,
            currentFontSize,
            currentFontSizePx,
            currentFontFamily,
            resolvedFontFamilies,
            setDefaultFontSize,
            setDefaultFontFamily,
        ],
    );

    const hasChildren = children !== undefined && children !== null;

    return (
        <LexicalComposer initialConfig={initialConfig}>
            <RichTextEditorContext.Provider value={contextValue}>
                <div
                    data-rte-scope={scopeId}
                    style={
                        {
                            '--rte-font-size': currentFontSizePx,
                            '--rte-font-family': currentFontFamily,
                        } as React.CSSProperties
                    }
                    className={twMerge(
                        'relative text-black leading-5 font-normal text-left overflow-hidden mx-auto my-5 w-[min(760px,100%)] rounded-2xl border border-slate-300/35 shadow-lg bg-[#fafbfc]',
                        EDITOR_THEMES[theme].className,
                        className,
                    )}
                >
                    {isDownloadingImages && (
                        <div className="flex items-center justify-center gap-2 p-2.5 bg-blue-50 text-blue-700 text-xs font-medium border-b border-blue-100 animate-pulse select-none">
                            <span className="w-3.5 h-3.5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
                            <span>Loading ServiceNow images...</span>
                        </div>
                    )}
                    <EditorExtensionsPlugin isEditable={isEditable} extensions={extensions} onEditorReady={handleEditorReady} />
                    <ShadowDomSelectionPlugin />
                    {hasChildren ? (
                        children
                    ) : (
                        <>
                            <Toolbar />
                            <Content />
                            <ActionBar />
                        </>
                    )}
                </div>
            </RichTextEditorContext.Provider>
        </LexicalComposer>
    );
};

RichTextEditor.Toolbar = Toolbar;
RichTextEditor.Content = Content;
RichTextEditor.ActionBar = ActionBar;

export { Toolbar as RichTextEditorToolbar, Content as RichTextEditorContent, ActionBar as RichTextEditorActionBar };
export default RichTextEditor;
